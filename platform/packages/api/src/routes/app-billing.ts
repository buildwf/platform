import { and, eq, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { authenticateOAuthClient, OAuthError } from '../auth/oauth.ts';
import {
  BillingUnavailableError,
  PAID_PLANS,
  createCheckoutSession,
  createPortalSession,
  type PaidPlan,
} from '../billing/stripe.ts';
import type { ApiEnv } from '../env.ts';
import { getDefaultPlan, resolvePlanLimits } from '../plans.ts';
import { appPeople, appUsage, appUsageEvents } from '../schema.ts';

const isPaidPlan = (value: unknown): value is PaidPlan =>
  typeof value === 'string' && Object.hasOwn(PAID_PLANS, value);
const isPersonId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200;
const isReturnUrl = (value: unknown): value is string =>
  typeof value === 'string' && URL.canParse(value) && new URL(value).protocol === 'https:';

/** First day of this calendar month in UTC, as `YYYY-MM-01`. */
const currentPeriod = (now = new Date()) => `${now.toISOString().slice(0, 7)}-01`;

type BillingContext = Context<ApiEnv>;

/** A person's plan, its caps, what they used this month, and whether they are still within the caps. */
async function standing(context: BillingContext, personId: string) {
  const db = context.get('db');
  const clientId = context.get('billingClient');
  const [row] = await db
    .select()
    .from(appPeople)
    .where(and(eq(appPeople.client_id, clientId), eq(appPeople.person_id, personId)));
  const plan = row?.plan ?? (await getDefaultPlan(db)).id;
  const limits = await resolvePlanLimits(db, plan);
  const [used] = await db
    .select()
    .from(appUsage)
    .where(
      and(
        eq(appUsage.client_id, clientId),
        eq(appUsage.person_id, personId),
        eq(appUsage.period, currentPeriod()),
      ),
    );
  const usage = { ai_neurons: used?.ai_neurons ?? 0, sandbox_seconds: used?.sandbox_seconds ?? 0 };
  // 0 means unlimited in a plan's limits.
  const within = (limit: number, value: number) => limit === 0 || value < limit;
  return {
    plan,
    limits,
    subscribed: Boolean(row?.stripe_subscription_id),
    period: currentPeriod(),
    usage,
    within_caps:
      within(limits.aiNeuronsPerMonth, usage.ai_neurons) &&
      within(limits.sandboxRuntimeSecondsPerMonth, usage.sandbox_seconds),
  };
}

/**
 * Billing for the people of a connected application. The application signs in with its client
 * credentials and names each person by its own id; the platform keeps that person's plan.
 * Whichever application calls, it only ever reaches its own people.
 */
export const appBillingRoutes = new Hono<ApiEnv>()
  .use('*', async (context, next) => {
    try {
      context.set('billingClient', (await authenticateOAuthClient(
        context.get('db'),
        context.req.header('Authorization'),
      )).id);
    } catch (error) {
      if (error instanceof OAuthError) {
        return context.json({ error: error.code, message: error.message }, error.status);
      }
      throw error;
    }
    return next();
  })
  .post('/plan', async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!isPersonId(body?.person_id)) return context.json({ error: 'bad_person_id' }, 400);
    return context.json({ data: await standing(context, body.person_id) });
  })
  .post('/usage', async (context) => {
    const body = await context.req.json().catch(() => null);
    const count = (value: unknown) =>
      value === undefined ? 0 : Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : -1;
    const neurons = count(body?.ai_neurons);
    const seconds = count(body?.sandbox_seconds);
    if (!isPersonId(body?.person_id)) return context.json({ error: 'bad_person_id' }, 400);
    if (typeof body?.event_id !== 'string' || !body.event_id || body.event_id.length > 200) {
      return context.json({ error: 'bad_event_id' }, 400);
    }
    if (neurons < 0 || seconds < 0) return context.json({ error: 'bad_usage' }, 400);
    const db = context.get('db');
    const clientId = context.get('billingClient');
    await db.transaction(async (tx) => {
      const fresh = await tx
        .insert(appUsageEvents)
        .values({ client_id: clientId, event_id: body.event_id })
        .onConflictDoNothing()
        .returning({ id: appUsageEvents.event_id });
      if (fresh.length === 0) return;
      await tx
        .insert(appUsage)
        .values({
          client_id: clientId,
          person_id: body.person_id,
          period: currentPeriod(),
          ai_neurons: neurons,
          sandbox_seconds: seconds,
        })
        .onConflictDoUpdate({
          target: [appUsage.client_id, appUsage.person_id, appUsage.period],
          set: {
            ai_neurons: sql`${appUsage.ai_neurons} + ${neurons}`,
            sandbox_seconds: sql`${appUsage.sandbox_seconds} + ${seconds}`,
          },
        });
    });
    return context.json({ data: await standing(context, body.person_id) });
  })
  .post('/checkout', async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!isPersonId(body?.person_id)) return context.json({ error: 'bad_person_id' }, 400);
    if (!isPaidPlan(body?.plan)) return context.json({ error: 'bad_plan' }, 400);
    if (!isReturnUrl(body?.return_url)) return context.json({ error: 'bad_return_url' }, 400);
    try {
      const url = await createCheckoutSession(context.env, {
        reference: `${context.get('billingClient')}:${body.person_id}`,
        metadata: { clientId: context.get('billingClient'), personId: body.person_id },
        email: typeof body.email === 'string' ? body.email : null,
        plan: body.plan,
        returnUrl: body.return_url,
      });
      return context.json({ data: { url } });
    } catch (error) {
      if (error instanceof BillingUnavailableError) return context.json({ error: 'billing_unavailable' }, 503);
      throw error;
    }
  })
  .post('/portal', async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!isPersonId(body?.person_id)) return context.json({ error: 'bad_person_id' }, 400);
    if (!isReturnUrl(body?.return_url)) return context.json({ error: 'bad_return_url' }, 400);
    const [row] = await context
      .get('db')
      .select()
      .from(appPeople)
      .where(
        and(
          eq(appPeople.client_id, context.get('billingClient')),
          eq(appPeople.person_id, body.person_id),
        ),
      );
    if (!row?.stripe_customer_id) return context.json({ error: 'no_subscription' }, 404);
    try {
      const url = await createPortalSession(context.env, {
        customerId: row.stripe_customer_id,
        returnUrl: body.return_url,
      });
      return context.json({ data: { url } });
    } catch (error) {
      if (error instanceof BillingUnavailableError) return context.json({ error: 'billing_unavailable' }, 503);
      throw error;
    }
  });
