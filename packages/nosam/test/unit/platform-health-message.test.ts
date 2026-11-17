import { afterEach, expect, it, vi } from 'vite-plus/test';
import { cliCommandName } from '../../src/cli/output.ts';
import { PlatformAccessBlockedError } from '../../src/cli/platform-installer.ts';

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['/usr/local/bin/nosam-dev', 'nosam-dev'],
  ['C:\\tools\\nosam-dev.cmd', 'nosam-dev'],
  ['/usr/local/bin/nosam', 'nosam'],
  ['/checkout/packages/nosam/dist/cli/cli.mjs', 'nosam'],
  ['/tmp/untrusted-command', 'nosam'],
  [undefined, 'nosam'],
])('recognizes the CLI entry %s in recovery commands', (entry, expected) => {
  vi.stubGlobal('process', { ...process, argv: [process.execPath, entry] });
  expect(cliCommandName()).toBe(expected);
});

it('shows the agreed dashboard instructions with the real installation details', () => {
  const error = new PlatformAccessBlockedError('https://api.example.workers.dev', {
    accountName: 'Example account',
    workers: ['nosam-example-api', 'nosam-example-proxy', 'nosam-example-dispatch'],
    resumeCommand: 'nosam-dev platform install --resume --name example-123',
  });
  expect(error.message)
    .toBe(`platform: Cloudflare Access blocked the platform health checks (Default-Deny, error 1050).
Blocked URL: https://api.example.workers.dev

To make this test platform publicly reachable:

1. In account "Example account", open:
   Zero Trust → Access controls → Applications → Create new application.
2. Choose Self-hosted. When adding destinations, choose Worker and select:
   nosam-example-api, nosam-example-proxy, nosam-example-dispatch.
3. Add a policy: Action → Bypass; Include → Everyone.
4. Save the policy and application, then resume:

   nosam-dev platform install --resume --name example-123

This removes Cloudflare Access protection for these Workers.
Nosam’s own authentication stays enabled. Keep account-wide Default-Deny on.

For platforms that must remain Access-protected:
https://void.cloud/guide/platform/installation/maintenance#cloudflare-access`);
});

it('does not tell upgrades or repairs to restart installation', () => {
  const error = new PlatformAccessBlockedError('https://api.example.com', {
    accountName: 'Example account',
    workers: ['original-api', 'original-proxy', 'original-dispatch'],
  });
  expect(error.message).toContain('rerun your platform command');
  expect(error.message).not.toContain('platform install');
  expect(error.message).toContain('original-api, original-proxy, original-dispatch');
});

it('does not invent resource names when no installation context is available', () => {
  const error = new PlatformAccessBlockedError('https://api.example.com');
  expect(error.message).toContain('In your Cloudflare account');
  expect(error.message).toContain("This installation's API, proxy, and dispatch Workers.");
  expect(error.message).not.toContain('undefined');
});

it('keeps protected installations out of the public Worker bypass instructions', () => {
  const error = new PlatformAccessBlockedError(
    'https://void-platform-health.apps.example.com/health',
    {
      accountName: 'Company',
      accessProtected: true,
      workers: ['api', 'proxy', 'dispatch'],
      resumeCommand: 'nosam platform install --resume --name team',
    },
  );
  expect(error.message).toContain(
    'Keep employee Access protection and account-wide Default-Deny enabled.',
  );
  expect(error.message).toContain('Nosam’s private probe token');
  expect(error.message).toContain(
    'Blocked URL: https://void-platform-health.apps.example.com/health',
  );
  expect(error.message).not.toMatch(/Bypass|Everyone|publicly reachable/);
});
