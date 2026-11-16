import { type } from 'arktype';
import { ProjectCreateError, createProjectForUser } from '../../routes/projects.ts';
import { member, procedure } from '../procedure.ts';

export const create = procedure('projects.create')
  .use(member)
  .noAuthz({ reason: 'Every signed in user may create projects on their own account' })
  .input(type({ slug: 'string' }))
  .output(
    type({
      id: 'string',
      slug: 'string',
      'url?': 'string',
      'warnings?': 'string[]',
      'zero_trust?': 'object | null',
      'owner_email_destination?': { address: 'string' },
    }),
  )
  .errors({
    SLUG_INVALID: { status: 400, message: 'slug is not a valid project name' },
    SLUG_SHORT_NOT_ALLOWED: { status: 403, message: 'slug is too short for this plan' },
    SLUG_TAKEN: { status: 409, message: 'slug already taken' },
    PLATFORM_UNINSTALLING: { status: 409, message: 'new projects cannot be created now' },
    AI_LOGGING_UNAVAILABLE: { status: 503, message: 'AI logging could not be applied' },
  })
  .mcp({ description: 'Create a project with the given slug', effect: 'write' })
  .cli({ command: 'project create', description: 'Create a project' })
  .handler(async ({ env, ctx, input, fail, waitUntil }) => {
    try {
      return await createProjectForUser(
        {
          env,
          db: ctx.db,
          user: ctx.user,
          // Unlike Hono's executionCtx, waitUntil here never throws, so there is no inline fallback.
          schedule: async (work) => waitUntil(work),
        },
        input.slug,
      );
    } catch (error) {
      if (error instanceof ProjectCreateError) return fail(error.code, error.message);
      throw error;
    }
  });
