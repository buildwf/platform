---
description: 'Deploy to Cloudflare Workers. Nosam detects the resources your app uses, creates bindings, and publishes the Worker.'
outline: deep
---

# Cloudflare

Nosam runs on Cloudflare Workers. It detects the resources your app uses, creates bindings, and deploys to your account.

## Bindings

In Nosam routes and middleware, use `c.env`:

```ts
// routes/api/users.ts
import { defineHandler } from 'nosam';

export const GET = defineHandler(async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users').all();
  return c.json({ users: results });
});
```

Server code outside a handler can also import bindings from `cloudflare:workers`:

```ts
import { env } from 'cloudflare:workers';

const { results } = await env.DB.prepare('SELECT * FROM users').all();
```

### TypeScript setup

Add `nosam/env` to your TypeScript types:

```json
{
  "compilerOptions": {
    "types": ["nosam/env"]
  }
}
```

This provides binding and Workers runtime types. For custom bindings in `nosam.config.ts`, run `nosam prepare` or start the dev server or build to type them on `c.env`. See [Custom Binding Types](../guide/type-safety.md#custom-binding-types) for RPC methods on service and Durable Object bindings.

### Available bindings

| Binding          | Resource        | Use in your app                   |
| ---------------- | --------------- | --------------------------------- |
| `DB`             | D1              | `c.env.DB` or `nosam/db`           |
| `KV`             | KV              | `c.env.KV` or `nosam/kv`           |
| `STORAGE`        | R2              | `c.env.STORAGE` or `nosam/storage` |
| `AI`             | Workers AI      | `c.env.AI` or `nosam/ai`           |
| `ASSETS`         | Static assets   | `c.env.ASSETS.fetch(request)`     |
| `QUEUE_*`        | Queues          | `defineQueue()` or `nosam/queues`  |
| Filename-derived | Durable Objects | A module in `durable-objects/`    |

Use [binding configuration](../reference/resource-inference.md#explicit-binding-overrides) when you need to enable, disable, or rename an inferred binding.

## Cloudflare Configuration

Define Worker settings in `nosam.config.ts`:

```ts
import { defineConfig } from 'nosam/config';

export default defineConfig({
  worker: {
    compatibility_date: '2026-02-24',
    compatibility_flags: ['nodejs_compat'],
  },
  cloudflare: {
    name: 'my-app',
    services: [{ binding: 'API', service: 'my-api-worker' }],
  },
});
```

Put binding arrays, resource IDs, routes, and service bindings under `cloudflare`. Nosam preserves your configured bindings and adds missing inferred resources. The `worker` field takes precedence for compatibility settings and variables. See [Configuration](../reference/config.md).

Commit `nosam.lock.json` when Nosam records resource IDs or Durable Object migrations. Keep generated Cloudflare config out of Git.

Declare environment variables in `env.ts`, put local values in `.env`, and set production server values with `nosam secret put`. See [Environment Variables](../guide/env-vars.md).

## Deploy to your own Cloudflare account

Choose Cloudflare during `nosam init`, then deploy:

```sh
nosam deploy
```

Nosam opens your browser to sign in and asks which account to use when you have several. If the browser doesn't open, follow the link and confirm the code printed in the terminal.

To set up deployment later, run `nosam connect --platform cloudflare`. To select Cloudflare for one deploy, run:

```sh
nosam deploy --platform cloudflare
```

Use `nosam cloudflare login`, `status`, and `logout` to manage your session.

### Deploy an existing Worker

For an existing Nosam app deployed directly to Cloudflare, keep its root `wrangler.jsonc` or `wrangler.json` and run:

```sh
nosam deploy
```

If no destination is selected, Nosam offers to link the existing Worker. Accept to sign in and deploy. Nosam migrates the configuration to `nosam.config.ts` and `nosam.lock.json`, preserving bindings, variables, secrets, routes, and schedules. Commit both files.

Keep the first deployment focused on the existing app. Add resources, auth, migrations, or other runtime features after linking. If the Worker has a newer inactive upload, activate or remove it in Cloudflare before retrying.

Readiness checks need either an existing [version metadata binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/) or access to [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). Nosam stops before activation if neither is available.

If linking reports a missing binding, use the existing Worker's binding name and resource ID in `cloudflare` and `inference.bindings`. Keep `.nosam/cloudflare-link.json` when retrying.

Before changing dashboard-managed triggers or visibility later, add the current `routes`, `workers_dev`, and `preview_urls` to your config. Convert `wrangler.toml` to JSON/JSONC before linking. Named environments need separate Nosam project configs.

### What happens during deploy

Nosam creates missing resources, builds the app, checks secrets and migrations, uploads the Worker, verifies readiness, and updates traffic and triggers. Resource IDs are saved in `nosam.lock.json`.

A failed build or validation can leave provisioned resources in your account. Run the first deploy from one machine at a time, then commit the lock file before deploying from other machines or CI.

Apps using email need `email.from` in `nosam.config.ts`. Nosam reviews the domain's setup before building and asks before changing it. See [Email](../guide/email/domains.md#your-own-cloudflare-account).

### Deploying from CI

Set these CI secrets and variables as needed:

| Name                                             | When needed                                                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                           | Required. Workers Scripts: Edit, read access to bound resources, and edit access to products Nosam provisions.                                                                            |
| `CLOUDFLARE_ACCOUNT_ID`                          | When the token can access several accounts.                                                                                                                                               |
| `DATABASE_URL`                                   | PostgreSQL and MySQL provisioning and migrations.                                                                                                                                         |
| `CLOUDFLARE_WORKERS_SUBDOMAIN`                   | When workers.dev is enabled and the version has no preview URL. Use `my-team` or `my-team.workers.dev`. An account subdomain does not create a readiness URL when `workers_dev` is false. |
| `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | When Cloudflare Access protects the readiness URL.                                                                                                                                        |
| `CF_ACCESS_READINESS_ORIGIN`                     | When Access protects a route or Custom Domain and `workers_dev` is `false`. See [Cloudflare Access](#cloudflare-access).                                                                  |

For email, run `nosam email setup --platform cloudflare` locally, commit `nosam.lock.json`, and pass `--require-email` in CI. The token also needs Email Routing Edit and Email Sending Edit.

#### Cloudflare Access

For local deployment to an Access-protected Worker, you can use a short-lived user session:

```sh
export CF_ACCESS_TOKEN="$(cloudflared access token --app=https://<worker>.<account>.workers.dev)"
```

Nosam uses Access credentials for readiness checks without saving them. If checks are denied, the deployment fails. A first-deploy bootstrap can already be active behind Access when this happens.

By default, Nosam sends Access credentials only to `workers.dev` URLs. If `workers_dev` is `false`, Nosam can check readiness through your first route or Custom Domain. To send the credentials there, set `CF_ACCESS_READINESS_ORIGIN` to that hostname's origin:

```sh
export CF_ACCESS_READINESS_ORIGIN="https://app.example.com"
```

Set this variable in the shell or CI environment running `nosam deploy`. Use an exact HTTPS origin for a hostname you control that serves this Worker; Nosam sends your Access credentials there.

### Databases and secrets

For PostgreSQL and MySQL, supply `DATABASE_URL` to the deploy process. Nosam uses it for Hyperdrive and migrations without writing it to config. MySQL schema changes can partially apply before an error; see [failed MySQL migrations](../guide/database/mysql.md#failed-migrations).

Creating Hyperdrive requires an API token with Hyperdrive edit permission. Alternatively, create it in Cloudflare and add its ID to `cloudflare.hyperdrive`; an existing binding works with browser login.

Run `nosam db generate` and commit migrations before deploying schema changes. This includes Better Auth tables. Custom D1 migration directories, tables, and patterns are supported; deploy stops if the files to apply differ from the validated history.

Set production server values with `nosam secret put <NAME>`. Nosam preserves existing remote secrets and creates `BETTER_AUTH_SECRET` when an auth app needs one. Local `.env` values are never deployed.

### Readiness and rollback

Nosam checks an uploaded version before sending it traffic. If the Worker has no public URL, because workers.dev is off and no route or Custom Domain is configured, Nosam activates it without a readiness check.

If readiness or trigger updates fail, Nosam restores the previous deployment. If trigger updates fail and the previous triggers can't be restored, such as after another tool's deployment or from an empty draft, the new version stays live. The error names the version serving traffic.

Finish or cancel gradual rollouts in Cloudflare before deploying through Nosam.

For an existing Durable Object Worker that Cloudflare cannot stage, review the changes and use:

```sh
nosam deploy --platform cloudflare --atomic
```

To use this on every deploy, set `deploy: { cloudflare: { mode: 'atomic' } }`. Atomic deployment sends traffic to the new version before its readiness check. Durable Object class migrations cannot be rolled back across their migration boundary.

A new Worker may need an active first deployment before readiness can be checked. Keep `.nosam/cloudflare-candidate.json` if a staged upload fails so you can retry from the same checkout.

Inspect or restore versions with:

```sh
nosam project status
nosam project rollback [version]
```

Nosam restores recorded triggers along with the code. Versions without a complete trigger snapshot keep current routes and schedules. Database recovery is separate: use [`nosam db restore`](../reference/cli/database.md#nosam-db-restore) to undo D1 migrations.

#### Scope and limitations

Nosam deploys Nosam apps (a React SPA with an optional backend), static SPAs, static sites, and supported SSGs.

- Nosam apps support Nosam routing rules for redirects, rewrites, fallbacks, and headers.
- `--skip-build` works for existing static output. Worker apps require a fresh build.
- Named Cloudflare environments aren't supported. Use a separate Nosam project config for each target.
- Sandbox requires Workers Paid and Docker. See [Sandbox requirements](../guide/sandboxes.md#deployment) for plan and token permissions.
- Email to arbitrary recipients requires Workers Paid; verified recipients and inbound mail work on Workers Free. See [Email](../guide/email/domains.md#your-own-cloudflare-account).

Commit Durable Object migration history in `nosam.lock.json`. Do not delete or reorder deployed steps.

### Managing the deployed app

`nosam secret`, `nosam domain`, `nosam project status|list|logs|rollback`, and remote `nosam db` commands use the selected account and Worker. Logs are a live tail.

Custom domain commands update routes immediately. If a first deployment times out while DNS or TLS is propagating, check the domain in Cloudflare and retry once `/__nosam/ready` is reachable.

`nosam project delete` does not remove Cloudflare resources. Review ownership and remove them in Cloudflare.

### Local development

Local D1, KV, and R2 bindings use local data. Your production resource IDs are used during deployment.

Workers AI runs remotely after you connect to Cloudflare, so development calls consume your account's allowance. Remote bindings in development and preview use your `nosam cloudflare login` session, or `CLOUDFLARE_API_TOKEN` when it is set.

### AI on your Cloudflare account {#ai-self-host}

`ai.run()`, `ai.stream()`, and `ai.image()` use your Workers AI binding. For provider models, configure your AI Gateway and store the provider key as a Worker secret:

```ts
import { defineConfig } from 'nosam/config';

export default defineConfig({
  ai: { gateway: 'my-gateway' },
});
```

```sh
nosam secret put OPENAI_API_KEY
```

`ai.provider('openai').fetch(...)` then uses that gateway and key. See the [AI guide](../guide/ai.md) for examples. Use [AI Gateway analytics](https://developers.cloudflare.com/ai-gateway/) to inspect account usage.
