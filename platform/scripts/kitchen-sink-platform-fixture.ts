import { appendFileSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIsolatedPlayground } from '../../test/integration-helpers.ts';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export function prepareKitchenSinkPlatformFixture(
  options: { sandbox?: boolean; email?: boolean; runtime?: boolean } = {},
) {
  const fixture = createIsolatedPlayground(workspaceRoot, 'playground/kitchen-sink');
  try {
    rmSync(join(fixture.root, '.env'), { force: true });
    if (!options.sandbox) {
      for (const path of ['routes/api/sandbox.ts', 'src/Sandbox.tsx', 'lib/sandbox-demo.ts']) {
        rmSync(join(fixture.root, path), { force: true });
      }
      const app = join(fixture.root, 'src/App.tsx');
      let source = readFileSync(app, 'utf8');
      for (const pattern of [
        /<Link href="\/sandbox">Sandbox<\/Link>\s*\|(\{' '\})?\s*/,
        /\s*'\/sandbox': lazyPage\(lazy\(\(\) => import\('\.\/Sandbox\.tsx'\)\)\),/,
      ]) {
        if (!pattern.test(source)) {
          throw new Error('Update the hosted kitchen-sink fixture navigation in src/App.tsx.');
        }
        source = source.replace(pattern, '');
      }
      writeFileSync(app, source);
    } else {
      cpSync(join(workspaceRoot, 'platform/scripts/fixtures/kitchen-sink-sandbox'), fixture.root, {
        recursive: true,
      });
    }
    if (options.email) {
      const source = join(workspaceRoot, 'platform/scripts/fixtures/kitchen-sink-email');
      cpSync(source, fixture.root, { recursive: true });
    } else {
      rmSync(join(fixture.root, 'email'), { recursive: true, force: true });
    }
    if (options.runtime) {
      cpSync(join(workspaceRoot, 'platform/scripts/fixtures/kitchen-sink-runtime'), fixture.root, {
        recursive: true,
      });
    }
    return fixture;
  } catch (error) {
    fixture.cleanup();
    throw error;
  }
}

if (import.meta.main) {
  const fixture = prepareKitchenSinkPlatformFixture({
    sandbox: process.argv.includes('--sandbox'),
    email: process.argv.includes('--email'),
    runtime: process.argv.includes('--runtime'),
  });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `path=${fixture.root}\n`);
  }
  console.log(`Prepared hosted kitchen-sink fixture: ${fixture.root}`);
}
