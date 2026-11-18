import { Hono } from 'hono';
import type { ApiEnv } from '../env.ts';
import { PAID_PLANS, verifyStripeSignature, type PaidPlan } from '../billing/stripe.ts';
import { changeOperatorUserPlan } from '../operator/tenant-service.ts';
import { getDefaultPlan } from '../plans.ts';

type StripeEvent = {
  type: string;
  data: { object: { metadata?: Record<string, string> } };
};

const isPaidPlan = (value: unknown): value is PaidPlan =>
  typeof value === 'string' && Object.hasOwn(PAID_PLANS, value);

/**
 * Stripe tells the platform when a subscription starts or ends, and the account's plan follows.
 * Plan limits, usage counters and suspension are the platform's own, so nothing else changes here.
 */
export const stripeWebhookRoutes = new Hono<ApiEnv>().post('/', async (context) => {
  const secret = context.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return context.json({ error: 'billing not configured' }, 503);
  const body = await context.req.text();
  if (!(await verifyStripeSignature(body, context.req.header('stripe-signature') ?? null, secret))) {
    return context.json({ error: 'bad signature' }, 400);
  }
  const event = JSON.parse(body) as StripeEvent;
  const metadata = event.data?.object?.metadata ?? {};
  const userId = metadata.userId;
  if (!userId) return context.json({ ok: true, ignored: true });

  if (event.type === 'checkout.session.completed' && isPaidPlan(metadata.plan)) {
    await changeOperatorUserPlan(context, userId, metadata.plan);
  } else if (event.type === 'customer.subscription.deleted') {
    await changeOperatorUserPlan(context, userId, (await getDefaultPlan(context.get('db'))).id);
  } else {
    return context.json({ ok: true, ignored: true });
  }
  return context.json({ ok: true });
});
