import { type } from 'arktype';
import { UsageUnavailableError, getAccountUsage, getProjectUsage } from '../../routes/usage.ts';
import { canOnProject, grantedAccess } from '../access.ts';
import { member, procedure } from '../procedure.ts';

const totals = { requests: 'number', bandwidthBytes: 'number', aiNeurons: 'number' } as const;
const unavailable = { USAGE_UNAVAILABLE: { status: 503, message: 'usage unavailable' } };

export const account = procedure('usage.account')
  .use(member)
  .noAuthz({ reason: 'Every signed in user may read their own usage' })
  .noInput()
  .output(
    type({
      'billingPeriodStart?': 'string',
      ...totals,
      projects: type({ projectId: 'string', slug: 'string', ...totals }).array(),
    }),
  )
  .errors(unavailable)
  .noMcp({ reason: 'No agent needs account usage yet' })
  .cli({ command: 'usage', description: 'Show usage across your projects this billing period' })
  .handler(async ({ env, ctx, fail }) => {
    try {
      return await getAccountUsage(env, ctx.db, ctx.user);
    } catch (error) {
      if (error instanceof UsageUnavailableError) {
        return fail('USAGE_UNAVAILABLE');
      }
      throw error;
    }
  });

export const project = procedure('projects.usage')
  .use(member)
  .input(type({ projectId: 'string' }))
  .authz({ policy: 'project-read', check: canOnProject('read') })
  .output(type({ projectId: 'string', billingPeriodStart: 'string', ...totals }))
  .errors(unavailable)
  .mcp({
    description: 'Requests, bandwidth and AI usage of one project this billing period',
    effect: 'read',
    idempotent: true,
  })
  .cli({ command: 'project usage', description: 'Show one project’s usage this billing period' })
  .handler(async ({ env, ctx, input, fail }) => {
    // Decision: Usage is billed to the project's owner, whose cycle may differ from the caller's.
    const { owner } = grantedAccess(ctx);
    try {
      return await getProjectUsage(env, input.projectId, owner.billing_cycle_start);
    } catch (error) {
      if (error instanceof UsageUnavailableError) {
        return fail('USAGE_UNAVAILABLE');
      }
      throw error;
    }
  });
