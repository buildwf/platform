import { describe, expect, it } from 'vite-plus/test';
import { PLATFORM_APPLICATION_KEY } from '../../src/application.ts';
import { PLATFORM_AUTH_SETUP_PROOF_PREFIX } from '../../src/authentication.ts';
import {
  PLATFORM_DISABLED_KEY,
  PLATFORM_R2_OWNERSHIP_MARKER_KEY,
  PLATFORM_REMOTE_INSTALLATION_MANIFEST_KEY,
  PLATFORM_SANDBOX_DRAIN_KEY,
} from '../../src/installation.ts';
import { createPlatformDeploymentManifest } from '../../src/manifest.ts';

// An install made from the rebrand-nosam branch (4f39e4c) stored these names. Renaming them
// leaves an upgrade unable to find its ownership records, so they stay as that release wrote them.
describe('names that an earlier install stored', () => {
  it('keeps the stored keys and proof prefix', () => {
    expect(PLATFORM_R2_OWNERSHIP_MARKER_KEY).toBe('__void/platform/ownership/v1');
    expect(PLATFORM_REMOTE_INSTALLATION_MANIFEST_KEY).toBe('__void/platform/installation/v1');
    expect(PLATFORM_DISABLED_KEY).toBe('__void/platform/disabled/v1');
    expect(PLATFORM_SANDBOX_DRAIN_KEY).toBe('__void/platform/sandbox-drain/v1');
    expect(PLATFORM_APPLICATION_KEY).toBe('__void/platform/application/v1');
    expect(PLATFORM_AUTH_SETUP_PROOF_PREFIX).toBe('void.platform.auth.setup.v1');
  });

  it('names resources the way that install did', () => {
    const { resources } = createPlatformDeploymentManifest({
      application: { baseDomain: 'apps.example.com', zoneName: 'example.com' },
      displayName: 'Nosam',
      installationSlug: 'nosam',
    });
    expect(resources.assetsBucket).toBe('void-nosam-assets');
    expect(resources.apiWorker).toBe('void-nosam-api');
  });
});
