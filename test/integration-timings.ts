// Windows file durations measured in https://github.com/voidzero-dev/void/actions/runs/36572350995.
// Edited suites use conservative estimates adjusted for removed browser cases and duplicate builds.
// These values schedule shards only; every discovered test is still included.
export const integrationTimings: Readonly<Record<string, number>> = {
  'packages/nosam/test/e2e/cloudflare-deploy-live.test.ts': 6,
  'packages/nosam/test/integration/cli-help.test.ts': 1718,
  'packages/nosam/test/integration/cli-runtime-check.test.ts': 900,
  'packages/nosam/test/integration/cloudflare-durable-build.test.ts': 15000,
  'packages/nosam/test/integration/cloudflare-deploy-build.test.ts': 6700,
  'packages/nosam/test/integration/durable-state-rpc.test.ts': 1160,
  'packages/nosam/test/integration/env-cli.test.ts': 2970,
  'packages/nosam/test/integration/env-server-build.test.ts': 873,
  'packages/nosam/test/integration/env-types-typecheck.test.ts': 1395,
  'packages/nosam/test/integration/full-deploy-manifest.test.ts': 6370,
  'packages/nosam/test/integration/kitchen-sink-build.test.ts': 7365,
  'packages/nosam/test/integration/kitchen-sink.test.ts': 20887,
  'packages/nosam/test/integration/mysql-test.test.ts': 11000,
  'packages/nosam/test/integration/operator-cli.test.ts': 4910,
  'packages/nosam/test/integration/pg-api-test.test.ts': 11000,
  'packages/nosam/test/integration/pg-test.test.ts': 16237,
  'packages/nosam/test/integration/plugin-env-schema.test.ts': 236,
  'packages/nosam/test/integration/prepare-cli.test.ts': 1957,
  'packages/nosam/test/integration/queue-dispatch.test.ts': 208,
  'packages/nosam/test/integration/sandbox-managed-rpc.test.ts': 722,
  'packages/nosam/test/integration/spa-middleware-auth.test.ts': 26264,
  'packages/nosam/test/integration/trigger-auth.test.ts': 400,
  'packages/nosam/test/integration/websocket-middleware.test.ts': 11188,
  'packages/nosam/test/integration/websockets-playground.test.ts': 16783,
};
