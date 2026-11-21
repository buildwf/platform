import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PLATFORM_VERSION_WORKER_DIRECTORIES = new Set(
  ['api', 'email-gateway'].map((name) =>
    fileURLToPath(new URL(`../packages/${name}`, import.meta.url)),
  ),
);

const RELEASE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function readPlatformReleaseVersion(): string {
  const { version } = JSON.parse(
    readFileSync(new URL('../../packages/platform/package.json', import.meta.url), 'utf8'),
  ) as { version?: unknown };
  if (typeof version !== 'string' || !RELEASE_VERSION.test(version)) {
    throw new Error(`packages/platform/package.json has no release version: ${String(version)}`);
  }
  return version;
}

export function platformVersionDeployArgs(
  workerDirectory: string,
  customConfig: boolean,
  version: string = readPlatformReleaseVersion(),
): Array<string> {
  if (customConfig || !PLATFORM_VERSION_WORKER_DIRECTORIES.has(workerDirectory)) {
    return [];
  }
  return ['--var', `PLATFORM_VERSION:${version}`];
}
