import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vite-plus/test';
import { registerOAuthClient } from '../../src/auth/oauth.ts';
import rawApp from '../../src/index.ts';
import {
  setupEnv,
  teardownEnv,
  clearTables,
  createMockExecutionContext,
  withLegacyDeploy,
  type TestEnv,
} from './helpers.ts';

const app = withLegacyDeploy(rawApp);
const origin = 'https://platform.example.com';
const ctx = createMockExecutionContext();
let env: TestEnv & { STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; STRIPE_PRICE_SOLO?: string };
let registration: Awaited<ReturnType<typeof registerOAuthClient>>;

const basic = () => 'Basic ' + btoa(registration.client.id + ':' + registration.clientSecret);
async function call(path: string, body: unknown, authorization = basic()) {
  return app.fetch(
    new Request(origin + '/app-billing' + path, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env,
    ctx,
  );
}

async function webhook(event: unknown, secret = 'whsec_test') {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
  const v1 = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('');
  return app.fetch(
    new Request(origin + '/billing/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${t},v1=${v1}` },
      body,
    }),
    env,
    ctx,
  );
}

describe('app billing', () => {
  beforeAll(async () => {
    env = await setupEnv();
    env.STRIPE_SECRET_KEY = 'sk_test_x';
    env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    env.STRIPE_PRICE_SOLO = 'price_solo';
  });
  afterAll(teardownEnv);
  beforeEach(async () => {
    await clearTables(env.db);
    registration = await registerOAuthClient(env.db, {
      name: 'Example',
      operator: 'Example Co',
      redirectUris: ['https://example.com/callback'],
      scopes: ['profile'],
    });
  });

  it('needs the application to sign in', async () => {
    expect((await call('/usage.status', { person: 'p1' }, 'Basic bm9wZTpub3Bl')).status).toBe(401);
  });

  it('starts a person on the default plan, counts their use once per id, and flags the cap for them alone', async () => {
    const first = (await (await call('/usage.status', { person: 'p1' })).json() as any).data;
    expect(first).toMatchObject({ plan: 'free', withinCaps: true, used: { aiNeurons: 0 } });

    const cap = first.caps.aiNeuronsPerMonth as number;
    const hit = (await (await call('/usage.record', { person: 'p1', id: 'e1', aiNeurons: cap })).json() as any).data;
    expect(hit).toMatchObject({ aiNeuronsUsed: cap, withinCaps: false });

    // The same report sent again isn't counted twice, and another person is untouched.
    const again = (await (await call('/usage.record', { person: 'p1', id: 'e1', aiNeurons: cap })).json() as any).data;
    expect(again.aiNeuronsUsed).toBe(cap);
    const other = (await (await call('/usage.status', { person: 'p2' })).json() as any).data;
    expect(other).toMatchObject({ withinCaps: true, aiWithinCap: true, used: { aiNeurons: 0 } });
    expect((await (await call('/usage.status', { person: 'p1' })).json() as any).data).toMatchObject({
      aiWithinCap: false,
      sandboxWithinCap: true,
    });
  });

  it('keeps one application away from another one’s people', async () => {
    await call('/usage.record', { person: 'p1', aiNeurons: 5 });
    const second = await registerOAuthClient(env.db, {
      name: 'Other',
      operator: 'Other Co',
      redirectUris: ['https://other.example/callback'],
      scopes: ['profile'],
    });
    const asOther = 'Basic ' + btoa(second.client.id + ':' + second.clientSecret);
    const seen = (await (await call('/usage.status', { person: 'p1' }, asOther)).json() as any).data;
    expect(seen.used.aiNeurons).toBe(0);
  });

  it('refuses bad input', async () => {
    expect((await call('/usage.record', { aiNeurons: 1 })).status).toBe(400);
    expect((await call('/usage.record', { person: 'p1', aiNeurons: -1 })).status).toBe(400);
    expect((await call('/billing.checkout', { person: 'p1', plan: 'solo', returnUrl: 'http://x.test' })).status).toBe(400);
  });

  it('moves a person to the plan they bought and back when the subscription ends', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).startsWith('https://api.stripe.com/')) {
        return Response.json({ url: 'https://stripe.example/session' });
      }
      return Response.error();
    });
    const checkout = await call('/billing.checkout', {
      person: 'p1',
      plan: 'solo',
      returnUrl: 'https://example.com/plan',
    });
    expect((await checkout.json() as any).data.url).toBe('https://stripe.example/session');
    expect((await call('/billing.portal', { person: 'p1', returnUrl: 'https://example.com/plan' })).status).toBe(404);

    const metadata = { clientId: registration.client.id, personId: 'p1', plan: 'solo' };
    expect(
      (
        await webhook({
          type: 'checkout.session.completed',
          data: { object: { metadata, customer: 'cus_1', subscription: 'sub_1' } },
        })
      ).status,
    ).toBe(200);
    const bought = (await (await call('/usage.status', { person: 'p1' })).json() as any).data;
    expect(bought).toMatchObject({ plan: 'solo', subscribed: true });
    const portal = await call('/billing.portal', { person: 'p1', returnUrl: 'https://example.com/plan' });
    expect((await portal.json() as any).data.url).toBe('https://stripe.example/session');
    fetchSpy.mockRestore();

    await webhook({ type: 'customer.subscription.deleted', data: { object: { metadata } } });
    expect((await (await call('/usage.status', { person: 'p1' })).json() as any).data).toMatchObject({
      plan: 'free',
      subscribed: false,
    });
  });

  it('refuses an unsigned webhook', async () => {
    const response = await app.fetch(
      new Request(origin + '/billing/stripe', { method: 'POST', body: '{}' }),
      env,
      ctx,
    );
    expect(response.status).toBe(400);
  });
});
