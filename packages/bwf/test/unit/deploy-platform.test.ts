import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { resolveDeploymentPlatform, runDeploy } from '../../src/cli/deploy.ts';

const roots: Array<string> = [];

function makeRoot(config?: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), 'nosam-deploy-platform-'));
  roots.push(root);
  if (config) {
    mkdirSync(join(root, '.bwf'), { recursive: true });
    writeFileSync(join(root, '.bwf', 'project.json'), JSON.stringify(config, null, 2) + '\n');
  }
  return root;
}

describe('resolveDeploymentPlatform', () => {
  afterEach(() => {
    while (roots.length > 0) {
      rmSync(roots.pop()!, { recursive: true, force: true });
    }
  });

  it('lets an explicit platform override the saved preference', () => {
    const root = makeRoot({ platform: 'cloudflare' });
    expect(resolveDeploymentPlatform(root, { platform: 'nosam' })).toBe('nosam');
  });

  it('retains bwf as the fallback for projects initialized by older SDKs', () => {
    expect(resolveDeploymentPlatform(makeRoot())).toBe('nosam');
  });

  it('stops with guidance when deployment setup was skipped', async () => {
    const root = makeRoot({ platform: 'none' });
    await expect(runDeploy(root)).rejects.toThrow(
      'Pass `--platform cloudflare` or `--platform bwf` to choose a destination.',
    );
  });
});
