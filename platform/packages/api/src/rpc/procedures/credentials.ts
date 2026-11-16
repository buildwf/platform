import { type } from 'arktype';
import {
  deleteProjectCredential,
  listProjectCredentials,
  upsertProjectCredential,
} from '../../db.ts';
import { encryptProjectSecret } from '../../project-secrets.ts';
import { credentialSecretName } from '../../routes/internal-credential.ts';
import { canOnProject } from '../access.ts';
import { member, procedure } from '../procedure.ts';

const provider = type("'github'");
const repository = type('string').narrow((value, ctx) =>
  /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(value) ? true : ctx.mustBe('owner/name'),
);

/**
 * Tokens the platform proxy holds for a project. Generated code and sandboxes ask the proxy to
 * call the provider; the token is stored encrypted and is never returned or bound into a worker.
 */
export const set = procedure('credentials.set')
  .use(member)
  .input(
    type({
      projectId: 'string',
      provider,
      token: 'string > 0',
      repositories: repository.array().atLeastLength(1).atMostLength(50),
    }),
  )
  .authz({ policy: 'project-configure', check: canOnProject('configure') })
  .output(type({ provider, repositories: 'string[]' }))
  .noErrors({ reason: 'Validation and authorization cover every refusal' })
  .mcp({
    description:
      'Store a provider token the proxy holds for a project, limited to named repositories',
    effect: 'write',
    idempotent: true,
  })
  .cli({ command: 'credentials set', description: 'Store a proxy-held provider token' })
  .handler(async ({ env, ctx, input }) => {
    const encrypted = await encryptProjectSecret(
      env,
      input.projectId,
      credentialSecretName(input.provider),
      input.token,
    );
    await upsertProjectCredential(ctx.db, {
      project_id: input.projectId,
      provider: input.provider,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      key_version: encrypted.keyVersion,
      repositories: input.repositories,
    });
    return { provider: input.provider, repositories: input.repositories };
  });

export const list = procedure('credentials.list')
  .use(member)
  .input(type({ projectId: 'string' }))
  .authz({ policy: 'project-configure', check: canOnProject('configure') })
  .output(type({ provider: 'string', repositories: 'string[]', updated_at: 'string' }).array())
  .noErrors({ reason: 'A project with no credentials returns an empty list' })
  .mcp({
    description:
      'List the providers and repositories whose tokens the proxy holds, never the tokens',
    effect: 'read',
    idempotent: true,
  })
  .cli({ command: 'credentials list', description: 'List proxy-held credentials' })
  .handler(async ({ ctx, input }) => [
    ...(await listProjectCredentials(ctx.db, input.projectId)).map((row) => ({
      provider: row.provider,
      repositories: [...row.repositories],
      updated_at: row.updated_at,
    })),
  ]);

export const remove = procedure('credentials.remove')
  .use(member)
  .input(type({ projectId: 'string', provider }))
  .authz({ policy: 'project-configure', check: canOnProject('configure') })
  .output(type({ removed: 'true' }))
  .noErrors({ reason: 'Removing a credential that is not stored is a no-op' })
  .mcp({ description: 'Remove a proxy-held provider token', effect: 'write', idempotent: true })
  .cli({ command: 'credentials remove', description: 'Remove a proxy-held credential' })
  .handler(async ({ ctx, input }) => {
    await deleteProjectCredential(ctx.db, input.projectId, input.provider);
    return { removed: true as const };
  });
