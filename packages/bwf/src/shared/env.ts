import { readdirSync } from 'node:fs';
import { join } from 'pathslash';
import { parseDotenvFile } from './dotenv.ts';

// Shared helpers for environment resolution, used by the Vite plugins,
// prerender, and the CLI. Keep these as leaf helpers — they must not
// import from any non-leaf module, otherwise the prerender subprocess's
// worker bundle acquires unwanted transitive dependencies.

/** bwf's single local dotenv file. It is never a production configuration source. */
export const LOCAL_ENV_FILE = '.env';

/** The fixed browser-exposure convention supported by `@builtbyfriends/bwf/env`. */
const CLIENT_ENV_PREFIX = 'VITE_';

export function isClientEnvKey(key: string): boolean {
  return key.startsWith(CLIENT_ENV_PREFIX);
}

/** Read the one local-development dotenv file. */
export function loadLocalEnv(
  root: string,
  options: { onWarn?: (message: string) => void } = {},
): Record<string, string> {
  return parseDotenvFile(join(root, LOCAL_ENV_FILE), { onWarn: options.onWarn });
}

/**
 * Marks the isolated probes and Vite build run by
 * `bwf deploy --platform cloudflare`.
 *
 * Kept here so the deploy orchestrator and Vite plugin share one spelling.
 * The marker is passed through child-process env only; it is never a Worker
 * binding and is not set for `bwf dev` or ordinary `vite build` commands.
 */
export const CLOUDFLARE_DEPLOY_BUILD_ENV = 'BWF_CLOUDFLARE_DEPLOY_BUILD';

/**
 * JSON map from each `queues/` name to the Cloudflare queue name that
 * `bwf deploy --platform cloudflare` chose. Set only for its Vite build.
 */
export const CLOUDFLARE_QUEUE_NAMES_BUILD_ENV = 'PLATFORM_CLOUDFLARE_QUEUE_NAMES';

/**
 * Find legacy Vite dotenv variants. bwf intentionally supports only `.env`;
 * production configuration is project-scoped remote state instead of a file.
 */
export function findLegacyEnvFiles(root: string): Array<string> {
  try {
    return readdirSync(root)
      .filter(
        (name) =>
          name.startsWith('.env.') ||
          name === '.env.example' ||
          name === '.dev.vars' ||
          name.startsWith('.dev.vars.'),
      )
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Sentence to append to a legacy-file error when `.env.example` is among the
 * files, since it is usually added out of habit to document expected keys.
 */
export function legacyEnvExampleHint(legacyFiles: ReadonlyArray<string>): string {
  return legacyFiles.includes('.env.example')
    ? ' env.ts lists the keys this app expects, so .env.example is not needed.'
    : '';
}

/**
 * Resolve whether the plugin should run in "remote" mode (proxy real
 * D1/KV/R2 via the platform) based on the project config plus an optional
 * `BWF_REMOTE` env override.
 *
 * Tri-state override semantics:
 *   - `BWF_REMOTE=1` → force remote mode on
 *   - `BWF_REMOTE=0` → force remote mode off (e.g. local/CI builds of a
 *     project whose `bwf.config.ts` sets `remote: true`)
 *   - unset / any other value → fall back to `config.remote`
 *
 * The dev-server plugin (index.ts), the prerender build plugin
 * (plugin-prerender.ts), and managed deploy (cli/deploy-managed-full.ts) must
 * derive `remoteMode` through this helper so dev and build stay in lockstep.
 */
export function resolveRemoteMode(configRemote: boolean | undefined): boolean {
  const override = process.env.BWF_REMOTE;
  if (override === '1') {
    return true;
  }
  if (override === '0') {
    return false;
  }
  return configRemote === true;
}

/**
 * Names starting with this prefix are reserved for bwf. bwf sets them
 * itself (proxy credentials, email and AI wiring), so `.env` and `env.ts`
 * must not define them: Wrangler loads `.env` into the dev Worker on its own
 * and writes it over `vars`, so dropping keys from `vars` cannot keep them
 * out. `envSchemaPlugin` and `bwf env check` reject them instead.
 */
const RESERVED_ENV_PREFIX = '__PLATFORM_';

/** Names in `keys` that use the reserved `__PLATFORM_` prefix, in input order. */
export function findReservedEnvKeys(keys: Iterable<string>): Array<string> {
  return Array.from(keys).filter((key) => key.startsWith(RESERVED_ENV_PREFIX));
}

/**
 * The error for reserved names found in `.env` or `env.ts`. Shared by the
 * Vite plugin and `bwf env check` so both print the same text.
 */
export function reservedEnvKeysMessage(source: '.env' | 'env.ts', keys: Array<string>): string {
  const verb = source === '.env' ? 'defines' : 'declares';
  return (
    `${source} ${verb} names reserved for bwf: ${keys.join(', ')}. ` +
    'bwf sets these itself; remove them. To trigger crons or queues locally, use the ' +
    'x-platform-dev-trigger header printed at dev start.'
  );
}
