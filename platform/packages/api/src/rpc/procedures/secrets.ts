import { type } from 'arktype';
import { listProjectSecretNames } from '../../db.ts';
import { canOnProject } from '../access.ts';
import { member, procedure } from '../procedure.ts';

export const list = procedure('secrets.list')
  .use(member)
  .input(type({ projectId: 'string' }))
  .authz({ policy: 'project-configure', check: canOnProject('configure') })
  .output(type({ name: 'string' }).array())
  .noErrors({ reason: 'A project with no secrets returns an empty list' })
  .mcp({
    description: 'List the names of a project’s secrets, never their values',
    effect: 'read',
    idempotent: true,
  })
  .cli({ command: 'secrets list', description: 'List secret names' })
  .handler(async ({ ctx, input }) => [...(await listProjectSecretNames(ctx.db, input.projectId))]);
