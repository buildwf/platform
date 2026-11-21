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

// Decision: An earlier install stored these names. Renaming them leaves an upgrade unable to find its
// ownership records, so they stay as that release wrote them.
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
      displayName: 'Platform',
      installationSlug: 'nosam',
      resources: { apiWorker: 'void-nosam-api' },
    });
    expect(resources.assetsBucket).toBe('void-nosam-assets');
    expect(resources.apiWorker).toBe('void-nosam-api');
  });

  it('names a new install platform-<slug>-<role>', () => {
    const { resources } = createPlatformDeploymentManifest({
      application: { baseDomain: 'apps.example.com', zoneName: 'example.com' },
      displayName: 'Platform',
      installationSlug: 'team',
    });
    expect(resources.apiWorker).toBe('platform-team-api');
  });
});
