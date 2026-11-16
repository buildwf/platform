import { type } from 'arktype';
import { getProjectDeployments } from '../../db.ts';
import { getDeploymentOperation, deploymentEventPage } from '../../deployment-execution.ts';
import { sanitizeDeploymentManifest } from '../../project-list.ts';
import { proxyTokenRotationWarnings } from '../../proxy-token-rotation.ts';
import { canOnProject, grantedAccess } from '../access.ts';
import { member, procedure } from '../procedure.ts';

export const list = procedure('deployments.list')
  .use(member)
  .input(type({ projectId: 'string' }))
  .authz({ policy: 'project-read', check: canOnProject('read') })
  .output(
    type({
      deployments: type({ id: 'string', status: 'string' }).array(),
      activeDeploymentId: 'string | null',
      'warnings?': 'string[]',
    }),
  )
  .noErrors({ reason: 'A project with no deployments returns an empty list' })
  .mcp({
    description: 'List a project’s 20 most recent deployments',
    effect: 'read',
    idempotent: true,
  })
  .cli({ command: 'deployments list', description: 'List recent deployments' })
  .handler(async ({ ctx }) => {
    const { project, role } = grantedAccess(ctx);
    const deployments = await getProjectDeployments(ctx.db, project.id, 20);
    // Deploy tokens run untrusted build code, and readers lack configure access. Strip plaintext
    // vars while keeping `live`, which the deploy CLI consumes.
    const sanitized =
      ctx.credential.project || role === 'reader'
        ? deployments.map((deployment) => ({
            ...deployment,
            manifest: sanitizeDeploymentManifest(deployment.manifest),
          }))
        : deployments;
    const warnings = await proxyTokenRotationWarnings(
      ctx.db,
      project.id,
      role,
      !!ctx.credential.project,
    );
    return {
      deployments: [...sanitized],
      activeDeploymentId: project.active_deployment_id,
      ...(warnings.length > 0 ? { warnings: [...warnings] } : {}),
    };
  });

/** A publish approval may read only the receipt of the deployment it made. */
const canRead = canOnProject('read');

export const events = procedure('deployments.events')
  .use(member)
  .input(type({ projectId: 'string', deploymentId: 'string', 'since?': 'number.integer >= 0' }))
  .authz({
    policy: 'project-read-own-receipt',
    check: async (caller, input) => {
      if (!(await canRead(caller, input))) return false;
      const { approval } = caller.credential;
      if (!approval) return true;
      const operation = await getDeploymentOperation(caller.db, input.deploymentId);
      return operation?.project_id === input.projectId && operation.idempotency_key === approval;
    },
  })
  .output(
    type({
      deploymentId: 'string',
      events: 'object[]',
      lastSeq: 'number',
      terminal: 'boolean',
      'heartbeat?': 'object',
    }),
  )
  .errors({ NOT_FOUND: { status: 404, message: 'deployment receipt not found' } })
  .noMcp({ reason: 'Agents read the final deployment from deployments.list' })
  .cli({
    command: 'deployments events',
    description: 'Page through a deployment’s progress events',
  })
  .handler(async ({ ctx, input, fail }) => {
    const operation = await getDeploymentOperation(ctx.db, input.deploymentId);
    if (!operation || operation.project_id !== input.projectId) return fail('NOT_FOUND');
    return deploymentEventPage(operation, input.since ?? 0);
  });
