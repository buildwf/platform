// Windows file durations measured in https://github.com/voidzero-dev/void/actions/runs/36572350995.
// Edited suites use conservative estimates adjusted for removed browser cases and duplicate builds.
// These values schedule shards only; every discovered test is still included.
export const integrationTimings: Readonly<Record<string, number>> = {
  'packages/void/test/e2e/cloudflare-deploy-live.test.ts': 6,
  'packages/void/test/integration/cli-help.test.ts': 1718,
  'packages/void/test/integration/cli-runtime-check.test.ts': 900,
  'packages/void/test/integration/cloudflare-durable-build.test.ts': 15000,
  'packages/void/test/integration/cloudflare-deploy-build.test.ts': 6700,
  'packages/void/test/integration/durable-state-rpc.test.ts': 1160,
  'packages/void/test/integration/env-cli.test.ts': 2970,
  'packages/void/test/integration/env-server-build.test.ts': 873,
  'packages/void/test/integration/env-types-typecheck.test.ts': 1395,
  'packages/void/test/integration/full-deploy-manifest.test.ts': 6370,
  'packages/void/test/integration/kitchen-sink-build.test.ts': 7365,
  'packages/void/test/integration/kitchen-sink.test.ts': 20887,
  'packages/void/test/integration/mysql-test.test.ts': 11000,
  'packages/void/test/integration/operator-cli.test.ts': 4910,
  'packages/void/test/integration/pg-api-test.test.ts': 11000,
  'packages/void/test/integration/pg-test.test.ts': 16237,
  'packages/void/test/integration/plugin-env-schema.test.ts': 236,
  'packages/void/test/integration/prepare-cli.test.ts': 1957,
  'packages/void/test/integration/queue-dispatch.test.ts': 208,
  'packages/void/test/integration/sandbox-managed-rpc.test.ts': 722,
  'packages/void/test/integration/spa-middleware-auth.test.ts': 26264,
  'packages/void/test/integration/trigger-auth.test.ts': 400,
  'packages/void/test/integration/websocket-middleware.test.ts': 11188,
  'packages/void/test/integration/websockets-playground.test.ts': 16783,
};
