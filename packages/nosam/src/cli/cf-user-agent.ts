import { readFileSync } from 'node:fs';
import { getOwnVersion } from './agents.ts';

let nosamUserAgent: string | undefined;
let cfCliVersion: string | undefined;

export function getNosamUserAgent(): string {
  if (nosamUserAgent === undefined) {
    nosamUserAgent = `nosam/${getOwnVersion()}`;
  }
  return nosamUserAgent;
}

/** cf prepends `cf-cli/` to CLI_VERSION for both API requests and uploads. */
export function getCfCliVersion(attribution?: string): string {
  // Scope this override to cf's child environment; never change Nosam's process.env.
  // Resolve the installed dependency rather than inheriting a caller's test override.
  if (cfCliVersion === undefined) {
    const pkg = JSON.parse(readFileSync(new URL(import.meta.resolve('cf/package.json')), 'utf8'));
    cfCliVersion = `${pkg.version} ${getNosamUserAgent()}`;
  }
  return attribution ? `${cfCliVersion} ${attribution}` : cfCliVersion;
}
