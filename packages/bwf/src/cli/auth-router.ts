import { isCancel, select } from '@voidzero-dev/vite-plus-prompts';
import type { AccountArgs } from './account-args.ts';
import type { AuthArgs } from './auth-args.ts';
import { listPlatformConnections, normalizePlatformApiUrl } from './platform-registry.ts';
import { readDeploymentPlatform } from './project.ts';

type Destination = { platform: 'cloudflare' | 'platform'; apiUrl?: string };

async function chooseDestination(
  root: string,
  args: AuthArgs,
  interactive: boolean,
): Promise<Destination> {
  const saved = readDeploymentPlatform(root);
  const platform = args.platform ?? (saved === 'none' ? null : saved);
  if (platform) {
    return { platform };
  }
  if (!interactive) {
    throw new Error(
      'auth: No deployment destination is saved. Use `bwf auth login --platform cloudflare|platform`, `bwf account login`, or `bwf cloudflare login`.',
    );
  }
  const connections = listPlatformConnections();
  const options = [
    { value: 'cloudflare', label: 'Cloudflare', hint: 'Your own Cloudflare account' },
    ...connections.map((connection) => ({
      value: connection.apiUrl,
      label: connection.displayName,
      hint: connection.apiUrl,
    })),
    // With no saved connection, a bwf platform has no origin to sign in to yet.
    ...(connections.length === 0
      ? [
          {
            value: 'platform',
            label: 'bwf platform',
            hint: 'Run `bwf connect <url>` first',
            disabled: true,
          },
        ]
      : []),
  ];
  const selected = await select({ message: 'Where do you want to authenticate?', options });
  if (isCancel(selected) || typeof selected !== 'string') {
    throw new Error('auth: Cancelled.');
  }
  return selected === 'cloudflare'
    ? { platform: 'cloudflare' }
    : { platform: 'platform', apiUrl: selected };
}

export async function runAuthRouter(
  root: string,
  args: AuthArgs,
  interactive: boolean = Boolean(process.stdin.isTTY),
): Promise<void> {
  const destination = await chooseDestination(root, args, interactive);
  if (destination.platform === 'cloudflare') {
    const { runCloudflareCommand } = await import('./cloudflare-cmd.ts');
    await runCloudflareCommand(root, { subcommand: args.subcommand });
    return;
  }

  const { runAccountCommand } = await import('./account-cmd.ts');
  const subcommand: AccountArgs['subcommand'] =
    args.subcommand === 'status' ? 'whoami' : args.subcommand;
  if (!destination.apiUrl) {
    await runAccountCommand(root, { subcommand });
    return;
  }
  // Account commands resolve their origin through BWF_API_URL. Scope a
  // prompt-selected origin to this invocation without changing the project.
  // BWF_TOKEN stays bound to the original BWF_API_URL: the prompt must never
  // choose its recipient, so another origin falls back to its saved login.
  const previous = { BWF_API_URL: process.env.BWF_API_URL, BWF_TOKEN: process.env.BWF_TOKEN };
  const tokenBound = Boolean(
    previous.BWF_TOKEN &&
    previous.BWF_API_URL &&
    normalizePlatformApiUrl(previous.BWF_API_URL) === destination.apiUrl,
  );
  process.env.BWF_API_URL = destination.apiUrl;
  if (previous.BWF_TOKEN && !tokenBound) {
    delete process.env.BWF_TOKEN;
  }
  try {
    await runAccountCommand(root, { subcommand });
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}
