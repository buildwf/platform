import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'pathslash';
import { getPackageDir } from './agents.ts';

/** A global CLI still builds with the project's installed Vite plugin. */
export function assertInstalledBwfMatchesCli(root: string): void {
  const projectManifest = join(root, 'package.json');
  if (!existsSync(projectManifest)) {
    return;
  }
  const project = JSON.parse(readFileSync(projectManifest, 'utf8')) as Record<string, unknown>;
  const declaresBwf = ['dependencies', 'devDependencies', 'optionalDependencies'].some((key) => {
    const dependencies = project[key];
    return (
      typeof dependencies === 'object' &&
      dependencies !== null &&
      '@builtbyfriends/bwf' in dependencies
    );
  });
  if (!declaresBwf) {
    return;
  }

  const cliPackageDir = getPackageDir();
  const cli = JSON.parse(readFileSync(join(cliPackageDir, 'package.json'), 'utf8')) as {
    version: string;
  };
  let installedVersion: string | undefined;
  let installedPackageDir: string | undefined;
  try {
    const entry = createRequire(projectManifest).resolve('@builtbyfriends/bwf');
    let directory = dirname(entry);
    for (let depth = 0; depth < 8; depth++) {
      const manifest = join(directory, 'package.json');
      if (existsSync(manifest)) {
        const installed = JSON.parse(readFileSync(manifest, 'utf8')) as {
          name?: string;
          version?: string;
        };
        if (installed.name === '@builtbyfriends/bwf') {
          installedVersion = installed.version;
          installedPackageDir = directory;
          break;
        }
      }
      directory = dirname(directory);
    }
  } catch {
    // The error below also covers a declared package that has not been installed.
  }
  if (installedVersion !== cli.version) {
    throw new Error(
      `deploy: this CLI is platform@${cli.version}, but the project's installed Vite plugin is ` +
        `${installedVersion ? `platform@${installedVersion}` : 'missing'}. ` +
        'Install the same bwf version in the project (or link this development checkout) ' +
        'before deploying. The build imports the project package; mixing versions can ' +
        'rewrite legacy config and produce an unsafe Cloudflare deploy target.',
    );
  }
  if (
    installedPackageDir &&
    existsSync(join(cliPackageDir, 'src', 'index.ts')) &&
    realpathSync(installedPackageDir) !== realpathSync(cliPackageDir)
  ) {
    throw new Error(
      'deploy: this development CLI and the project Vite plugin come from different bwf ' +
        'builds, even though their package versions match. Link the same development checkout ' +
        'into the project before deploying.',
    );
  }
}
