import { describe, expect, it, vi } from 'vite-plus/test';
import {
  BillingUnavailableError,
  createCheckoutSession,
  stripeSecretKey,
  verifyStripeSignature,
} from '../../src/billing/stripe.ts';

async function sign(body: string, secret: string, t: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v1=${Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

describe('stripe billing', () => {
  const now = 1_800_000_000_000;
  const t = now / 1000;

  it('accepts a fresh, correct signature and refuses the rest', async () => {
    const header = await sign('{"a":1}', 'whsec', t);
    expect(await verifyStripeSignature('{"a":1}', header, 'whsec', now)).toBe(true);
    expect(await verifyStripeSignature('{"a":2}', header, 'whsec', now)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', header, 'other', now)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', header, 'whsec', now + 10 * 60_000)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', null, 'whsec', now)).toBe(false);
  });

  it('keeps live keys off until they are switched on', () => {
    expect(stripeSecretKey({ STRIPE_SECRET_KEY: 'sk_test_x' })).toBe('sk_test_x');
    expect(() => stripeSecretKey({ STRIPE_SECRET_KEY: 'sk_live_x' })).toThrow(
      BillingUnavailableError,
    );
    expect(stripeSecretKey({ STRIPE_SECRET_KEY: 'sk_live_x', STRIPE_LIVE_ENABLED: 'true' })).toBe(
      'sk_live_x',
    );
    expect(() => stripeSecretKey({})).toThrow(BillingUnavailableError);
  });

  it('starts a subscription checkout that carries the account id', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const form = new URLSearchParams(String(init?.body));
      expect(form.get('metadata[userId]')).toBe('usr_1');
      expect(form.get('line_items[0][price]')).toBe('price_solo');
      return Response.json({ url: 'https://checkout.stripe.com/c/1' });
    });
    const url = await createCheckoutSession(
      { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_SOLO: 'price_solo' },
      {
        reference: 'usr_1',
        metadata: { userId: 'usr_1' },
        email: null,
        plan: 'solo',
        returnUrl: 'https://app.example/billing',
      },
      fetcher as never,
    );
    expect(url).toBe('https://checkout.stripe.com/c/1');
  });
});
