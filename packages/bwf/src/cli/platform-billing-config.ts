import { log } from '@voidzero-dev/vite-plus-prompts';
import { printSuccess } from './output.ts';
import type { PlatformBillingArgs } from './platform-config-args.ts';
import {
  parsePlatformBillingSecrets,
  readPlatformBillingInput,
} from './platform-installer-secrets.ts';
import { PLATFORM_BILLING_SECRET_NAMES } from './platform-installer-types.ts';
import {
  readInstallationRecoverySecrets,
  resolveInstallationManifest,
  saveInstallationRecoveryValues,
} from './platform-registry.ts';

const MAX_STDIN_BYTES = 32_768;

async function readBillingStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new Error('platform: --stdin needs NAME=value lines piped on standard input.');
  }
  let input = '';
  for await (const chunk of process.stdin) {
    input += String(chunk);
    if (input.length > MAX_STDIN_BYTES) {
      throw new Error('platform: The billing values on standard input are too large.');
    }
  }
  return input;
}

/**
 * Save the Stripe values of an installation with its other encrypted recovery
 * values. The next `bwf platform upgrade` or `repair` sets them on the API
 * Worker. Values are never printed, only their names.
 */
export async function runPlatformBillingConfig(
  args: PlatformBillingArgs,
  dependencies: {
    env?: Readonly<Record<string, string | undefined>>;
    readStdin?: () => Promise<string>;
    registryDirectory?: string;
  } = {},
): Promise<void> {
  const manifest = resolveInstallationManifest(args.installation, dependencies.registryDirectory);
  const recovery = readInstallationRecoverySecrets(manifest, dependencies.registryDirectory) ?? {};
  const saved = parsePlatformBillingSecrets(recovery.billingJson);
  if (args.action === 'show') {
    for (const name of PLATFORM_BILLING_SECRET_NAMES) {
      log.message(`${name}: ${saved[name] ? 'saved' : 'not set'}`);
    }
    if (recovery.billingPending === 'true') {
      log.info('The next bwf platform upgrade or repair sets these values on the API Worker.');
    }
    return;
  }
  const given = readPlatformBillingInput(
    dependencies.env ?? process.env,
    args.stdin ? await (dependencies.readStdin ?? readBillingStdin)() : null,
  );
  const names = Object.keys(given);
  if (names.length === 0) {
    throw new Error(
      `platform: No billing values found. Set one or more of ${PLATFORM_BILLING_SECRET_NAMES.join(', ')} in the environment, or pipe NAME=value lines with --stdin.`,
    );
  }
  saveInstallationRecoveryValues(
    manifest,
    { billingJson: JSON.stringify({ ...saved, ...given }), billingPending: 'true' },
    dependencies.registryDirectory,
  );
  printSuccess(
    `Saved ${names.join(', ')} for ${manifest.id}. Run bwf platform upgrade ${manifest.id} to set them on the API Worker.`,
  );
}
