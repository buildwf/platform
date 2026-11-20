import { describe, expect, it } from 'vite-plus/test';
import { readSettledPlatformWorkerDeployments } from '../../src/cli/platform-installer-inspection.ts';

const listing = (...ids: Array<string>) =>
  ids.map((id, index) => ({
    created_on: new Date(Date.UTC(2026, 10, 20, 0, 0, 60 - index)).toISOString(),
    id,
    versions: [{ percentage: 100, version_id: `${id}-version` }],
  }));

describe('readSettledPlatformWorkerDeployments', () => {
  it('reads again while Cloudflare still lists the replaced deployment', async () => {
    const reads = [listing('old'), listing('old'), listing('new', 'old')];
    let calls = 0;
    const runner = (async () => ({ data: reads[calls++], status: 0 })) as never;
    const deployments = await readSettledPlatformWorkerDeployments(
      'wrangler.json',
      'account',
      'platform-main-api',
      runner,
      (current) => current[0]?.id === 'old',
      [0, 0, 0],
    );
    expect(calls).toBe(3);
    expect(deployments.map((deployment) => deployment.id)).toEqual(['new', 'old']);
  });

  it('returns the last read when the list never settles', async () => {
    let calls = 0;
    const runner = (async () => {
      calls++;
      return { data: listing('old'), status: 0 };
    }) as never;
    const deployments = await readSettledPlatformWorkerDeployments(
      'wrangler.json',
      'account',
      'platform-main-api',
      runner,
      (current) => current[0]?.id === 'old',
      [0, 0],
    );
    expect(calls).toBe(3);
    expect(deployments[0]?.id).toBe('old');
  });
});
