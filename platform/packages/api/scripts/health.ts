/**
 * Check the selected platform with the public operator CLI.
 *
 * From the repository root:
 *   vp run --filter @nosamcloud/platform health --connection https://platform.example.com
 *   vp run --filter @nosamcloud/platform health:staging  # Nosam Cloud maintainers
 *
 * Sign in with `bwf platform auth login`, or supply NOSAM_OPERATOR_TOKEN and
 * BWF_API_URL in automation. Build the SDK with `vp run build` first.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cliPath = resolve(import.meta.dirname, '../../../../packages/bwf/dist/cli/cli.mjs');
const args = process.argv.slice(2);
const staging = args.includes('--staging');

if (
  staging &&
  (args.some((arg) => arg === '--connection' || arg.startsWith('--connection=')) ||
    (process.env.BWF_API_URL && process.env.BWF_API_URL !== 'https://api.staging.void.cloud'))
) {
  console.error('Choose --staging or a custom platform destination, not both.');
  process.exitCode = 1;
} else if (!existsSync(cliPath)) {
  console.error('Build the SDK first: run `vp run build` from the repository root.');
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      'platform',
      'system',
      'health',
      ...args.filter((arg) => arg !== '--staging'),
      ...(staging ? ['--connection', 'https://api.staging.void.cloud'] : []),
    ],
    { stdio: 'inherit' },
  );
  if (result.error) {
    console.error(`Could not start the platform CLI: ${result.error.message}`);
  }
  process.exitCode = result.status ?? 1;
}
