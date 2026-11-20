import { type } from 'arktype';
import { BillingUnavailableError, createCheckoutSession } from '../../billing/stripe.ts';
import { member, procedure } from '../procedure.ts';

export const checkout = procedure('billing.checkout')
  .use(member)
  .noAuthz({ reason: 'A signed in user buys a plan for their own account' })
  .input(type({ plan: "'solo' | 'pro'", returnUrl: 'string' }))
  .output(type({ url: 'string' }))
  .errors({
    BILLING_UNAVAILABLE: { status: 503, message: 'billing unavailable' },
    BAD_RETURN_URL: { status: 400, message: 'returnUrl must be an https URL' },
  })
  .noMcp({ reason: 'A person pays, not an agent' })
  .noCli({ reason: 'Checkout opens in a browser' })
  .handler(async ({ env, ctx, input, fail }) => {
    if (!URL.canParse(input.returnUrl) || new URL(input.returnUrl).protocol !== 'https:') {
      return fail('BAD_RETURN_URL');
    }
    try {
      const url = await createCheckoutSession(env, {
        reference: ctx.user.id,
        metadata: { userId: ctx.user.id },
        email: ctx.user.email,
        plan: input.plan,
        returnUrl: input.returnUrl,
      });
      return { url };
    } catch (error) {
      if (error instanceof BillingUnavailableError) {
        return fail('BILLING_UNAVAILABLE');
      }
      throw error;
    }
  });
