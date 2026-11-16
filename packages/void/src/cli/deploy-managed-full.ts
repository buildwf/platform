import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'pathslash';
import { analyzeApplication } from '../application-routing.ts';
import {
  hasApiRoutes as routeScanHasApiRoutes,
  hasDocumentRoutes as routeScanHasDocumentRoutes,
  resolveAssetConfig,
} from '../asset-routing.ts';
import { type VoidConfig } from '../config.ts';
import { hasEmailHandlers } from '../router/email.ts';
import { requiresSandboxPlatformImage, resolveSandboxConfig } from '../sandbox/config.ts';
import { buildEnv } from '../shared/untrusted-env.ts';
import { resolveDistDir, resolveWorkerDirName } from './build-output-dir.ts';
import { PlatformClient } from './client.ts';
import { assertDeploySchemaDriftFree } from './deploy-drift.ts';
import {
  resolveFullDeployBuildCommand,
  log,
  getExitCode,
  resolveDeployLiveBindingConfig,
  resolveDeployWranglerCompat,
  resolveDeployWorkerMain,
  assertEnvSchemaValid,
  assertWorkerMainUploaded,
  validateDeployMigrations,
  ensureManagedHyperdrive,
  toManifestSchedulesAndQueues,
} from './deploy-helpers.ts';
import {
  mergeAndLintRoutingRules,
  streamDirectR2Deploy,
  warnUnpublishedRouting,
} from './deploy-managed-events.ts';
import { formatDeploySummary, printDeploySuccess } from './deploy-summary.ts';
import { MANAGED_DEPLOY_BUILD_ENV } from './deploy-transport.ts';
import { type GitDeployMetadata } from './git-metadata.ts';
import { type CliLogger } from './log-file.ts';
import { createSpinner, formatCount, note } from './output.ts';
import {
  buildVoidManifest,
  collectAndHashAssets,
  collectWorkerFiles,
  detectNonSpaFallbackWarning,
} from './package.ts';
import { type ProjectConfig } from './project.ts';
import type { AssetConfig } from './types.ts';

export async function runFullDeploy(
  root: string,
  config: ProjectConfig,
  client: PlatformClient,
  /**
   * The already-read `void.config.ts`, threaded from `runDeploy`. The build step reads
   * `inference.build` from it, so it must be available BEFORE the build.
   */
  voidConfig: VoidConfig,
  skipBuild?: boolean,
  gitMetadata?: GitDeployMetadata,
  cliLog?: CliLogger,
  skipMigrations?: boolean,
): Promise<void> {
  cliLog?.info('deploy_mode', { mode: 'full' });

  // Build in a child process to avoid Vite API side effects on bundle output.
  if (!skipBuild) {
    const { label: buildCmd, command: buildExec } = resolveFullDeployBuildCommand(
      root,
      voidConfig.inference?.build,
    );
    log.step(`Building (${buildCmd})...`);
    cliLog?.info('build_start', { command: buildCmd });
    const buildStartedAt = Date.now();
    try {
      // VOID_DEPLOY_PROJECT_ID marks a managed build: platform dispatch owns routing.
      execSync(buildExec, {
        cwd: root,
        stdio: 'inherit',
        env: buildEnv(
          { VOID_DEPLOY_PROJECT_ID: config.projectId, ...MANAGED_DEPLOY_BUILD_ENV },
          { localBinRoot: root },
        ),
      });
      cliLog?.info('build_end', { durationMs: Date.now() - buildStartedAt });
    } catch (err: unknown) {
      cliLog?.error('build_failed', err, { durationMs: Date.now() - buildStartedAt });
      process.exit(getExitCode(err));
    }
  } else {
    cliLog?.info('build_skipped', { reason: 'skipBuild' });
  }

  // Resolve output paths from build artifacts instead of re-resolving the Vite
  // config here; plugins run only once, inside the build.
  const distDir = resolveDistDir(root);
  const workerDirName = resolveWorkerDirName(distDir);

  // Detect non-default assetsDir from Vite client manifest for _headers generation
  let assetsPrefix = 'assets';
  const clientManifestPath = join(distDir, 'client', '.vite', 'manifest.json');
  if (existsSync(clientManifestPath)) {
    const manifest: Record<string, { file?: string }> = JSON.parse(
      readFileSync(clientManifestPath, 'utf-8'),
    );
    for (const entry of Object.values(manifest)) {
      if (entry.file?.includes('/')) {
        const dir = entry.file.slice(0, entry.file.indexOf('/'));
        if (dir !== 'assets') {
          assetsPrefix = dir;
        }
        break;
      }
    }
  }

  const analysis = await analyzeApplication(root, { config: voidConfig, environment: 'prod' });
  const { paths, dialect, bindings, authEnabled, scan: routeScan } = analysis;

  const sandboxConfig = bindings.needsSandbox ? resolveSandboxConfig(voidConfig, root) : undefined;
  if (bindings.needsSandbox && requiresSandboxPlatformImage(voidConfig)) {
    log.error(
      'deploy: `sandbox.image` points at a local Dockerfile. Add `sandbox.platformImage` with a pushed registry image for `void deploy`, or deploy this sandbox directly with Wrangler.',
    );
    process.exit(1);
  }

  // Merge user `_headers` / `_redirects` in the built client dir with
  // `void.config.ts` routing rules.
  const clientDir = join(distDir, 'client');
  const { headerRules, redirectRules, fallbackRules } = mergeAndLintRoutingRules(
    clientDir,
    voidConfig.routing,
  );

  assertDeploySchemaDriftFree(root, dialect);

  // Validate migrations before the Hyperdrive check so migrations can gate provisioning.
  const validatedMigrations = validateDeployMigrations(
    paths.migrationsDir,
    analysis.migrations,
    paths.sourceRelative,
  );

  // Pre-deploy: ensure Hyperdrive is provisioned for external SQL projects.
  // Migrations on disk also gate this — even if inference says needsD1: false,
  // buildVoidManifest will add the hyperdrive binding when migrations are present.
  if (dialect !== 'sqlite' && analysis.needsDatabase) {
    await ensureManagedHyperdrive(client, config.projectId, dialect);
  }
  const rawJobs = analysis.jobs;
  const rawQueues = analysis.queues;
  const { schedules, queues } = toManifestSchedulesAndQueues(rawJobs, rawQueues);
  const webSockets = analysis.websockets;
  const liveConfig = await resolveDeployLiveBindingConfig(root, client, config.projectId, {
    needsLive: bindings.needsLive,
    webSockets,
    sandboxClassName: sandboxConfig?.className,
    cliLog,
  });
  const hasRoutes = routeScan.routes.length > 0;
  const hasApiRoutes =
    routeScanHasApiRoutes(routeScan.routes) || routeScanHasApiRoutes(webSockets) || authEnabled;
  const hasDocumentRoutes = routeScanHasDocumentRoutes(routeScan.routes);
  const hasMiddleware = routeScan.middleware.length > 0;
  const hasWebSockets = webSockets.length > 0;
  const wranglerCompat = resolveDeployWranglerCompat(
    root,
    voidConfig,
    join(distDir, workerDirName),
    {
      authEnabled,
      dialect,
      needsSandbox: bindings.needsSandbox,
    },
  );
  const workerMain = resolveDeployWorkerMain(voidConfig, join(distDir, workerDirName));

  await assertEnvSchemaValid(root, client, config.projectId, voidConfig.worker?.vars);

  const s = createSpinner();
  const onProgress = (msg: string) => s.message(msg);

  const assetConfig: AssetConfig = resolveAssetConfig({
    hasApiRoutes,
    hasDocumentRoutes,
    hasMiddleware,
    hasWebSockets: routeScanHasDocumentRoutes(webSockets),
    authEnabled,
    liveEnabled: liveConfig !== undefined,
    notFound: voidConfig.routing?.notFound,
  });

  // Preflight: hash assets and check which ones changed.
  // `assetFiles` carries the in-memory buffer cache through to the upload
  // step so each asset is read from disk exactly once.
  s.start('Checking for changes...');
  cliLog?.info('preflight_start', { dir: clientDir });
  const { assetManifest, assetFiles } = await collectAndHashAssets(clientDir, onProgress);
  const { needed, skipped } = await client.preflight(config.projectId, assetManifest, true);
  s.stop('Checked for changes');
  cliLog?.info('preflight_end', {
    total: Object.keys(assetManifest).length,
    needed: needed.length,
    skipped,
  });

  if (skipped > 0) {
    log.info(`Skipping ${formatCount(skipped, 'unchanged asset')}`);
  }

  s.start('Packaging...');
  cliLog?.info('package_start', {
    mode: 'full',
    hasRoutes,
    hasMiddleware,
    hasWebSockets,
    authEnabled,
  });
  const packageStartedAt = Date.now();
  const voidPackageOptions = {
    bindingNames: analysis.bindingNames,
    compatibilityDate: wranglerCompat?.compatibilityDate,
    compatibilityFlags: wranglerCompat?.compatibilityFlags,
    cpuMs: voidConfig.worker?.limits?.cpu_ms,
    ...(workerMain && { workerMain }),
    ...(sandboxConfig && { sandbox: sandboxConfig }),
    ...(liveConfig && { live: liveConfig }),
  };

  // Surface the non-SPA-fallbacks mismatch (if any) before invoking the
  // I/O-free manifest builder.
  const fallbackWarning = detectNonSpaFallbackWarning(assetConfig, fallbackRules);
  if (fallbackWarning) {
    onProgress(fallbackWarning);
    console.warn(`[void] ${fallbackWarning}`);
  }

  const manifest = buildVoidManifest({
    bindings: liveConfig ? { ...bindings, needsLive: true } : bindings,
    alwaysUseHttps: voidConfig.routing?.alwaysUseHttps,
    storage: voidConfig.storage,
    hasEmailHandlers: routeScan.email !== undefined && hasEmailHandlers(routeScan.email),
    migrations: validatedMigrations,
    schedules,
    ssr: hasRoutes || hasMiddleware || hasWebSockets || authEnabled,
    vars: voidConfig.worker?.vars,
    queues,
    assetConfig,
    options: voidPackageOptions,
    hashedAssetsPrefix: assetsPrefix,
    headerRules,
    redirectRules,
    fallbackRules,
    dialect,
    webSockets,
    durableObjects: analysis.durableObjects,
  });
  if (skipMigrations) {
    manifest.migrationMode = 'skip';
  }
  const workerDir = join(distDir, workerDirName);
  const workerFiles = collectWorkerFiles(workerDir);
  assertWorkerMainUploaded(workerFiles, workerMain);
  cliLog?.info('package_end', {
    mode: 'full',
    durationMs: Date.now() - packageStartedAt,
  });
  const result = await streamDirectR2Deploy({
    client,
    projectId: config.projectId,
    manifest,
    assetManifest,
    assetFiles,
    needed,
    gitMetadata,
    preflightUsed: skipped > 0,
    workerFiles,
    spinner: s,
    cliLog,
  });

  note(
    formatDeploySummary({
      workers: result.workers,
      assets: result.assets,
      unchangedAssets: skipped,
      migrations: result.migrations,
      cronJobs: schedules.length,
      queues: queues.length,
    }),
    result.url,
  );

  warnUnpublishedRouting(result);
  printDeploySuccess(result.published !== false);
}
