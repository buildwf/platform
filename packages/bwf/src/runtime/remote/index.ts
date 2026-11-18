import { ProxyClient } from './client.ts';
import { ProxyD1Database } from './d1.ts';
import { ProxyKVNamespace } from './kv.ts';
import { ProxyR2Bucket } from './r2.ts';

/**
 * Replace local D1/KV/R2 bindings with proxy-backed versions.
 * Called from the generated worker entry point when `__NOSAM_REMOTE` is set.
 *
 * @deprecated Internal to bwf. The generated worker calls this in remote mode.
 * `@buildwf/bwf/remote` is not a supported import. Removed in the next major version.
 */
export function createRemoteEnv(
  env: Record<string, unknown>,
  bindingNames?: { d1?: string; kv?: string; r2?: string },
): Record<string, unknown> {
  const client = new ProxyClient(
    env.__NOSAM_PROXY_URL as string,
    env.__NOSAM_TOKEN as string,
    env.__NOSAM_PROJECT_ID as string,
    env,
  );
  const d1Name = bindingNames?.d1 ?? 'DB';
  const kvName = bindingNames?.kv ?? 'KV';
  const r2Name = bindingNames?.r2 ?? 'STORAGE';
  return {
    ...env,
    ...(env[d1Name] != null && { [d1Name]: new ProxyD1Database(client, d1Name) }),
    ...(env[kvName] != null && { [kvName]: new ProxyKVNamespace(client, kvName) }),
    ...(env[r2Name] != null && { [r2Name]: new ProxyR2Bucket(client, r2Name) }),
  };
}
