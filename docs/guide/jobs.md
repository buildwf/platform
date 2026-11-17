---
description: 'Schedule work in crons/. Each file sets a cron expression and a handler that Nosam registers on deploy.'
outline: deep
---

# Cron Jobs

Put scheduled jobs in `crons/`. Each file declares a cron expression and a handler, and Nosam configures the schedule when you deploy.

## Job files

Create files in `crons/**/*.ts` (`.mts`, `.js`, `.mjs` also supported).

Each job file must export:

- `export const cron = "<expression>"` (or an array of expressions)
- a default handler (recommended: wrapped with `defineScheduled`)

Example:

```ts
// crons/hourly-heartbeat.ts
import { defineScheduled } from 'void';

export const cron = '0 * * * *';

export default defineScheduled(async (controller, env) => {
  await env.KV.put('jobs:last-heartbeat', controller.scheduledTime.toString());
});
```

### Multiple schedules

A single job file can export an array of cron expressions:

```ts
// crons/cleanup.ts
import { defineScheduled } from 'void';

export const cron = ['0 * * * *', '30 * * * *'];

export default defineScheduled(async (controller, env) => {
  // Runs at :00 and :30 every hour
});
```

## `defineScheduled`

Wrap a handler with [`defineScheduled()`](../reference/api/handlers.md#definescheduled-handler) to type its scheduled event, environment, and execution context.

Jobs sharing a cron expression each run once per invocation. Nosam waits for all matching jobs and reports any failures. Files and directories starting with `_` are ignored.

## Local development

Schedules don't fire automatically in local development. Test a job by sending a request to Nosam's development endpoint:

```
POST /__void/scheduled
Content-Type: application/json
{ "cron": "<expression>", "scheduledTime": <unix_ms> }
```

Set `cron` to an expression exported by your job. A successful call returns `{ "ok": true }`.

The endpoint requires a local dev trigger token. Nosam prints a paste-ready curl command with the current token when the dev server starts.

```bash
curl -X POST http://localhost:5173/__void/scheduled \
  -H "Content-Type: application/json" \
  -H "x-void-dev-trigger: <printed-token>" \
  -d '{"cron":"0 * * * *","scheduledTime":'"$(date +%s000)"'}'
```

The endpoint works in Nosam apps during development.

## Deployment behavior

Deployed jobs run from Cloudflare's scheduled events and do not require a manual HTTP token.

On a Nosam platform, each project can use up to 100 different cron expressions and 1,000 schedules (each expression a job exports counts as one schedule). Jobs that share an expression count once toward the expression limit. When you deploy to your own Cloudflare account, Cloudflare's [Cron Trigger limits](https://developers.cloudflare.com/workers/platform/limits/) apply instead.
