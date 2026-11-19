import {
  createApplicationRoutes,
  createPlatformDeploymentManifest,
  createPlatformResourceNames,
  parsePlatformDeploymentManifest,
} from '@builtbyfriends/platform';
import { describe, expect, it } from 'vite-plus/test';

describe('platform deployment manifest', () => {
  it('creates isolated resource names', () => {
    expect(createPlatformResourceNames('Developer Platform Experience')).toEqual({
      aiGateway: 'nosam-developer-platform-experience',
      apiWorker: 'nosam-developer-platform-experience-api',
      assetsBucket: 'nosam-developer-platform-experience-assets',
      cronQueue: 'nosam-developer-platform-experience-cron-fires',
      deploymentQueue: 'nosam-developer-platform-experience-deployments',
      dashboardWorker: 'nosam-developer-platform-experience-dashboard',
      dispatchNamespace: 'nosam-developer-platform-experience-users',
      dispatchWorker: 'nosam-developer-platform-experience-dispatch',
      emailGatewayWorker: 'nosam-developer-platform-experience-email-gateway',
      hyperdrive: 'nosam-developer-platform-experience-database',
      isrCacheKv: 'nosam-developer-platform-experience-isr-cache',
      legacyAssetsKv: 'nosam-developer-platform-experience-legacy-assets',
      logsDataset: 'nosam_developer_platform_experience_logs',
      proxyWorker: 'nosam-developer-platform-experience-proxy',
      requestsDataset: 'nosam_developer_platform_experience_requests',
      routingKv: 'nosam-developer-platform-experience-routing',
      tailWorker: 'nosam-developer-platform-experience-tail',
      usageQueue: 'nosam-developer-platform-experience-usage-events',
    });
  });

  it('limits shared-zone routes to the application base domain', () => {
    expect(
      createApplicationRoutes({
        baseDomain: 'apps.example.com',
        dedicatedZone: false,
        zoneName: 'example.com',
      }),
    ).toEqual([
      { pattern: '*.apps.example.com/*', zoneName: 'example.com' },
      { pattern: '*.apps.example.com', zoneName: 'example.com' },
    ]);
  });

  it('requires an explicit dedicated-zone choice for catch-all routes', () => {
    expect(
      createApplicationRoutes({
        baseDomain: 'example.com',
        dedicatedZone: true,
        zoneName: 'example.com',
      }),
    ).toEqual([
      { pattern: '*.example.com/*', zoneName: 'example.com' },
      { pattern: '*.example.com', zoneName: 'example.com' },
      { pattern: '*/*', zoneName: 'example.com' },
      { pattern: '*', zoneName: 'example.com' },
    ]);
    expect(() =>
      createApplicationRoutes({
        baseDomain: 'apps.example.com',
        dedicatedZone: true,
        zoneName: 'example.com',
      }),
    ).toThrow('requires the application domain to be the zone');
  });

  it('round-trips a non-secret deployment manifest', () => {
    const manifest = createPlatformDeploymentManifest({
      application: { baseDomain: 'apps.example.com', zoneName: 'example.com' },
      displayName: 'My Platform',
      installationSlug: 'my-platform',
    });
    expect(parsePlatformDeploymentManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });

  it('round-trips minimal runtime logs at schema version 5', () => {
    const input = {
      application: { baseDomain: 'apps.example.com', zoneName: 'example.com' },
      displayName: 'My Platform',
      installationSlug: 'my-platform',
    };
    const manifest = createPlatformDeploymentManifest({ ...input, runtimeLogs: 'minimal' });
    expect(manifest).toMatchObject({ runtimeLogs: 'minimal', schemaVersion: 5 });
    expect(parsePlatformDeploymentManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
    const full = createPlatformDeploymentManifest(input);
    expect(full.schemaVersion).toBe(1);
    expect(() => parsePlatformDeploymentManifest({ ...full, runtimeLogs: 'minimal' })).toThrow(
      'schema version 5',
    );
  });

  it('keeps paid container capabilities opt-in', () => {
    const manifest = createPlatformDeploymentManifest({
      application: { baseDomain: 'example.com', zoneName: 'example.com' },
      displayName: 'My Platform',
      installationSlug: 'my-platform',
    });
    expect(manifest.capabilities.managedBuilds).toBe(false);
    expect(manifest.capabilities.sandbox).toBe(false);
  });
});
