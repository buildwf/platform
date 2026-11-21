import type { AssetConfig } from './cli/types.ts';
import type { NotFoundHandling } from './config.ts';
import type { RouteDefinition } from './router/parse-filename.ts';

export type AssetRoutingInputs = {
  hasApiRoutes?: boolean;
  hasDocumentRoutes: boolean;
  hasMiddleware: boolean;
  /** True only when a websocket route is outside /api and can own document paths. */
  hasWebSockets?: boolean;
  authEnabled?: boolean;
  liveEnabled?: boolean;
  /**
   * `routing.notFound` from the bwf config. Overrides the INFERRED
   * `not_found_handling`. `run_worker_first`, `workerFirst` and
   * `apiWorkerFirst` are untouched, so which layer sees a request first never
   * changes. `workerSpaFallback` DOES follow it — see below.
   */
  notFound?: NotFoundHandling;
};

export type AssetRoutingPolicy = {
  assetConfig: AssetConfig;
  apiWorkerFirst: boolean;
  workerFirst: boolean;
  workerSpaFallback: boolean;
};

function isApiRoutePattern(pattern: string): boolean {
  return pattern === '/api' || pattern.startsWith('/api/');
}

export function hasDocumentRoutes(routes: Array<Pick<RouteDefinition, 'pattern'>>): boolean {
  return routes.some((route) => !isApiRoutePattern(route.pattern));
}

export function hasApiRoutes(routes: Array<Pick<RouteDefinition, 'pattern'>>): boolean {
  return routes.some((route) => isApiRoutePattern(route.pattern));
}

/**
 * Returns true when browser document navigations must reach the worker before
 * a static asset fallback can serve HTML.
 */
export function workerOwnsHtmlRouting(inputs: AssetRoutingInputs): boolean {
  return (
    inputs.hasDocumentRoutes ||
    inputs.hasMiddleware ||
    inputs.hasWebSockets === true ||
    inputs.liveEnabled === true
  );
}

/**
 * Returns true when native edge rules must run in the worker before Cloudflare
 * Static Assets can answer: native builds compile HTTPS redirects and header,
 * redirect, rewrite and fallback rules into the worker.
 */
export function edgeRulesNeedWorker(rules: {
  alwaysUseHttps?: boolean;
  headerRules?: ReadonlyArray<unknown>;
  redirectRules?: ReadonlyArray<unknown>;
  fallbackRules?: ReadonlyArray<unknown>;
}): boolean {
  return (
    rules.alwaysUseHttps === true ||
    (rules.headerRules?.length ?? 0) > 0 ||
    (rules.redirectRules?.length ?? 0) > 0 ||
    (rules.fallbackRules?.length ?? 0) > 0
  );
}

export function resolveAssetConfig(inputs: AssetRoutingInputs): AssetConfig {
  return resolveAssetRoutingPolicy(inputs).assetConfig;
}

// Decision: bwf's reserved internal namespace (`/__platform/ready`, `/__platform/migrate/*` and so on) has
// to reach the worker before CF Static Assets can serve the SPA shell. Otherwise
// `not_found_handling: 'single-page-application'` returns index.html for
// GET /__platform/migrate/capabilities and migration capability negotiation fails at deploy time.
// The worker-first (`/**`) branch already covers it. Both SPA-fallback branches have to list it,
// since a SPA can advertise migrations without API or auth routes (for example a cron or
// queue-only app with D1 migrations still emits manifest.migrations).
export const BWF_INTERNAL_WORKER_FIRST: ReadonlyArray<string> = ['/__platform', '/__platform/*'];

export function resolveAssetRoutingPolicy(inputs: AssetRoutingInputs): AssetRoutingPolicy {
  const workerFirst = workerOwnsHtmlRouting(inputs);
  const apiWorkerFirst =
    !workerFirst && (inputs.hasApiRoutes === true || inputs.authEnabled === true);
  const assetConfig: AssetConfig = workerFirst
    ? { not_found_handling: 'none', run_worker_first: ['/**'] }
    : apiWorkerFirst
      ? {
          not_found_handling: 'single-page-application',
          run_worker_first: ['/api', '/api/*', ...BWF_INTERNAL_WORKER_FIRST],
        }
      : {
          not_found_handling: 'single-page-application',
          run_worker_first: [...BWF_INTERNAL_WORKER_FIRST],
        };
  // Decision: An explicit `routing.notFound` wins over the inferred value. It's applied here, on the inputs,
  // and not at the call sites, so dev, build and deploy can't drift apart. `run_worker_first` is
  // deliberately left as inferred.
  if (inputs.notFound !== undefined) {
    assetConfig.not_found_handling = inputs.notFound;
  }
  return {
    assetConfig,
    apiWorkerFirst,
    workerFirst,
    // Decision: The worker-side SPA fallback replaces the SPA behavior the inferred `workerFirst` config gives up
    // (`not_found_handling: 'none'` makes `env.ASSETS.fetch()` return a bare 404 for an unmatched
    // navigation). `not_found_handling` still applies inside `env.ASSETS.fetch()`, so an explicit
    // `notFound` other than `single-page-application` has to turn the fallback off, or the shell would
    // answer before that setting is consulted.
    workerSpaFallback:
      workerFirst &&
      (inputs.notFound === undefined || inputs.notFound === 'single-page-application'),
  };
}
