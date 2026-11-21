import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'pathslash';

export type PM = 'npm' | 'pnpm' | 'yarn' | 'bun';

const PLATFORM_PNPM_ALLOWED_BUILDS = ['esbuild', 'sharp', 'workerd'] as const;
// Decision: Builds bwf's dependencies don't need. Keep this in step with PNPM_BUILD_DEFAULTS in
// packages/bwf/src/cli/init.ts.
const PLATFORM_PNPM_DENIED_BUILDS = ['better-sqlite3', 'core-js-pure'] as const;

/** Write the explicit build-script policy required by a new pnpm project. */
export function writePnpmBuildPolicy(root: string, pm: PM): void {
  if (pm !== 'pnpm') {
    return;
  }
  writeFileSync(
    join(root, 'pnpm-workspace.yaml'),
    // Decision: better-sqlite3 13 ships Node-API binaries and declares gypfile:false. Match the repository
    // policy instead of invoking pnpm's implicit rebuild. core-js-pure's install script only
    // prints a message.
    `allowBuilds:\n${[
      ...PLATFORM_PNPM_DENIED_BUILDS.map((name) => `  ${name}: false`),
      ...PLATFORM_PNPM_ALLOWED_BUILDS.map((name) => `  ${name}: true`),
    ].join('\n')}\n`,
  );
}

export function detectPM(): PM {
  const agent = process.env.npm_config_user_agent;
  if (agent) {
    if (agent.startsWith('pnpm/')) {
      return 'pnpm';
    }
    if (agent.startsWith('yarn/')) {
      return 'yarn';
    }
    if (agent.startsWith('bun/')) {
      return 'bun';
    }
  }
  return 'npm';
}

export function pmInstall(pm: PM): ReadonlyArray<string> {
  // Decision: Scaffolding changes package.json, so CI's default frozen install can't be used until the
  // initializer has generated the final lockfile. When init has already installed with Vite+,
  // pnpm wants to rebuild node_modules and would stop to ask first, so answer that up front.
  return pm === 'pnpm'
    ? [pm, 'install', '--no-frozen-lockfile', '--config.confirm-modules-purge=false']
    : [pm, 'install'];
}

export function pmExec(pm: PM): ReadonlyArray<string> {
  switch (pm) {
    case 'npm':
      return ['npx'];
    case 'pnpm':
      return ['pnpm', 'exec'];
    case 'yarn':
      return ['yarn', 'exec'];
    case 'bun':
      return ['bunx'];
  }
}

export function run(argv: ReadonlyArray<string>, cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = argv;
    // Decision: On Windows the package-manager entry points (npm, npx, pnpm, yarn, bunx) are .cmd/.ps1
    // shims that spawn() can't resolve without a shell, so it throws ENOENT. Enable a shell only
    // on win32. Each arg here is a fixed literal or a plain flag checked by parseCreateArgs, so
    // there's no injection surface.
    const child = spawn(cmd, args, { stdio: 'inherit', cwd, shell: process.platform === 'win32' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`create-bwf: '${cmd}' exited with code ${code}.`));
      }
    });
    child.on('error', reject);
  });
}
