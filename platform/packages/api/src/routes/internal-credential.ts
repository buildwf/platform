import { Hono } from 'hono';
import { getProjectCredential } from '../db.ts';
import type { ApiEnv } from '../env.ts';
import { requireProxyInternalAuth } from '../internal-proxy-auth.ts';
import { decryptProjectSecret } from '../project-secrets.ts';

const app = new Hono<ApiEnv>();

/**
 * Internal credential read, called by the proxy over its service binding. The decrypted token
 * goes only to the proxy, which attaches it to an outbound request and never returns it.
 *
 * POST /internal/credential/:projectId   Body: { "provider": "github" }
 * Returns: { "token": "...", "repositories": ["owner/name"] } or 404
 */
app.post('/:projectId', async (context) => {
  const projectId = context.req.param('projectId');
  const denied = await requireProxyInternalAuth(context, 'credential', projectId);
  if (denied) {
    return denied;
  }
  const { provider } = await context.req.json<{ provider?: string }>();
  if (!provider) {
    return context.json({ error: 'provider required' }, 400);
  }
  const row = await getProjectCredential(context.get('db'), projectId, provider);
  if (!row) {
    return context.json({ error: `no ${provider} credential` }, 404);
  }
  const token = await decryptProjectSecret(context.env, projectId, {
    name: credentialSecretName(provider),
    ciphertext: row.ciphertext,
    iv: row.iv,
    key_version: row.key_version,
  });
  return context.json({ token, repositories: row.repositories });
});

/** The AAD name a credential is encrypted under, so it cannot be swapped with a project secret. */
export function credentialSecretName(provider: string): string {
  return `credential:${provider}`;
}

export default app;
