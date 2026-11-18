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
let env: TestEnv;
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
    expect((await call('/plan', { person_id: 'p1' }, 'Basic bm9wZTpub3Bl')).status).toBe(401);
  });

  it('starts a person on the default plan, counts their use once per event, and flags the cap', async () => {
    const first = await (await call('/plan', { person_id: 'p1' })).json();
    expect(first.data).toMatchObject({ plan: 'free', subscribed: false, within_caps: true });

    const cap = first.data.limits.aiNeuronsPerMonth as number;
    const used = await (
      await call('/usage', { person_id: 'p1', event_id: 'e1', ai_neurons: cap })
    ).json();
    expect(used.data.usage.ai_neurons).toBe(cap);
    expect(used.data.within_caps).toBe(false);

    // The same report sent again isn't counted twice, and another person is untouched.
    const again = await (
      await call('/usage', { person_id: 'p1', event_id: 'e1', ai_neurons: cap })
    ).json();
    expect(again.data.usage.ai_neurons).toBe(cap);
    expect((await (await call('/plan', { person_id: 'p2' })).json()).data.usage.ai_neurons).toBe(0);
  });

  it('refuses bad input', async () => {
    expect((await call('/usage', { person_id: 'p1', ai_neurons: 1 })).status).toBe(400);
    expect((await call('/usage', { person_id: 'p1', event_id: 'e', ai_neurons: -1 })).status).toBe(400);
    expect((await call('/checkout', { person_id: 'p1', plan: 'solo', return_url: 'http://x.test' })).status).toBe(400);
  });

  it('moves a person to the plan they bought and back when the subscription ends', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input, init) => {
        if (String(input).startsWith('https://api.stripe.com/')) {
          return Response.json({ url: 'https://checkout.stripe.com/c/1' });
        }
        return Response.error();
      },
    );
    const checkout = await call('/checkout', {
      person_id: 'p1',
      plan: 'solo',
      return_url: 'https://example.com/plan',
    });
    expect((await checkout.json()).data.url).toBe('https://checkout.stripe.com/c/1');
    fetchSpy.mockRestore();

    const metadata = { clientId: registration.client.id, personId: 'p1', plan: 'solo' };
    expect(
      (
        await webhook({
          type: 'checkout.session.completed',
          data: { object: { metadata, customer: 'cus_1', subscription: 'sub_1' } },
        })
      ).status,
    ).toBe(200);
    const bought = (await (await call('/plan', { person_id: 'p1' })).json()).data;
    expect(bought).toMatchObject({ plan: 'solo', subscribed: true });

    await webhook({ type: 'customer.subscription.deleted', data: { object: { metadata } } });
    expect((await (await call('/plan', { person_id: 'p1' })).json()).data).toMatchObject({
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
