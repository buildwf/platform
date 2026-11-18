---
description: 'Commands for creating a project, deploying it, and managing databases, secrets, domains, and a platform.'
outline: deep
---

<script setup>
import LegacyDocRedirect from "../.vitepress/theme/LegacyDocRedirect.vue";
import links from "../.vitepress/redirects/reference-cli.json";
</script>

<LegacyDocRedirect page="reference/cli.md" :links="links" />

# CLI Reference {#cli}

`bwf` is a local binary from the installed `bwf` package.

Use this page as a command reference. If you are setting up a project for the first time, start with [Quickstart](../guide/quickstart.md) and come back here when you need exact command behavior or flags.

## Command Groups

| Command group                              | Reference                                                     |
| ------------------------------------------ | ------------------------------------------------------------- |
| `init`, `prepare`, `info`, `migrate`       | [Project setup](./cli/setup.md)                               |
| `connect`, `auth`, `account`, `cloudflare` | [Connections and authentication](./cli/auth.md)               |
| `project`                                  | [Projects, teams, logs, and rollback](./cli/project.md)       |
| `deploy`                                   | [Deployment](./cli/deploy.md)                                 |
| `db`                                       | [Database](./cli/database.md)                                 |
| `gen`                                      | [Code generation](./cli/generate.md)                          |
| `secret`, `env`                            | [Secrets and environment](./cli/secrets.md)                   |
| `github`, `build`                          | [GitHub and builds](./cli/github.md)                          |
| `domain`                                   | [Custom domains](./cli/domains.md)                            |
| `email`                                    | [Email](./cli/email.md)                                       |
| `platform`                                 | [Platform installation and administration](./cli/platform.md) |

## Cheat Sheet {#cheat-sheet}

Platform administrators can also choose AI Gateway logging [per project](./cli/platform-users.md#ai-gateway-logging) with `bwf platform project ai-logging`, or [per plan](../guide/platform/administration/plans.md#ai-gateway-logging) with `bwf platform config plans`.

| Command                          | Purpose                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `bwf deploy`                     | Build and deploy to the configured platform                                   |
| `bwf deploy --skip-migrations`   | Deploy code without applying application or authentication SQL migrations     |
| `bwf prepare`                    | Generate `.bwf` artifacts without starting Vite                               |
| `bwf info [--json]`              | Inspect persistent resource names before moving their code                    |
| `bwf gen model <name> [cols...]` | Scaffold a Drizzle table and API routes                                       |
| `bwf gen route <path>`           | Create an API route                                                           |
| `bwf db push`                    | Apply schema directly without migration files                                 |
| `bwf db generate`                | Generate SQL migrations from schema changes                                   |
| `bwf db status`                  | Show local/remote migration status                                            |
| `bwf db reset`                   | Drop and re-apply all migrations                                              |
| `bwf db seed`                    | Reset + seed local database                                                   |
| `bwf db execute <sql>`           | Run SQL against the database (--remote for deployed)                          |
| `bwf db studio`                  | Open Drizzle Studio (--remote for a deployed external database)               |
| `bwf db restore --bookmark <b>`  | Restore the deployed D1 database to a restore point (direct Cloudflare)       |
| `bwf secret put <name=value>`    | Set a production secret                                                       |
| `bwf secret list`                | List production secrets                                                       |
| `bwf secret sync <file>`         | Bulk upload secrets from dotenv file                                          |
| `bwf env check [--remote]`       | Validate env.ts schema                                                        |
| `bwf env types`                  | Regenerate .bwf/env.d.ts from env.ts                                          |
| `bwf auth login`                 | Authenticate with the project’s saved destination, or choose one              |
| `bwf account login`              | Authenticate with a bwf platform                                              |
| `bwf cloudflare login`           | Authenticate with Cloudflare through bwf                                      |
| `bwf platform install`           | Install a company bwf platform in Cloudflare                                  |
| `bwf connect <url>`              | Connect the CLI to a bwf platform; hostnames default to HTTPS                 |
| `bwf project link`               | Link directory to a project                                                   |
| `bwf project logs`               | Show runtime logs from deployed project                                       |
| `bwf project requests`           | Show request-level traffic (status, method, timing)                           |
| `bwf project rollback`           | Roll back to a previous deployment                                            |
| `bwf project cancel`             | Cancel an active deployment                                                   |
| `bwf project zero-trust`         | Inspect or override project Zero Trust protection                             |
| `bwf build logs`                 | Stream, tail, or download build logs                                          |
| `bwf email status`               | Show email readiness on your own Cloudflare account (`--platform cloudflare`) |
| `bwf email setup`                | Set email up on your own Cloudflare account, without deploying                |
| `bwf email usage`                | Show monthly recipient attempts, inbound receipts, and quota                  |
| `bwf email logs`                 | Show recent email delivery activity                                           |
| `bwf email destinations`         | List verified recipient addresses                                             |
| `bwf email allow <address>`      | Add a recipient and send a verification email                                 |
| `bwf email disallow <address>`   | Remove a recipient from the allowlist                                         |
| `bwf email alias [name]`         | Show the shared mail address, or give it a shorter permanent name             |
| `bwf email domain`               | Send and receive at your own domain on a Cloudflare zone                      |
| `bwf init`                       | Set up a new or existing project, including coding agents                     |
| `bwf migrate`                    | Update project configuration                                                  |

## Binary Invocation {#binary-invocation}

The docs use `bwf` for brevity. Outside package scripts, run it with your package manager: `npx bwf`, `pnpm void`, `yarn void`, `bunx bwf`, or `vpx void`.

The CLI needs Node.js 24.22+ or 26.12+. `npx`, `bunx` and package scripts use the `node` on your `PATH`; `vpx` uses the version in `.node-version`.

Alternatively, you can add `./node_modules/.bin` to your `PATH` so that you can invoke `bwf` directly when you are in the root directory of your app.

:::warning ⚠️ Prefer local install
Install `bwf` in your project so the CLI and runtime use the same version.
:::

## Help {#help}

```
void --help
bwf help
bwf help <command>
bwf help <group> <command>
void <command> --help
void <group> <command> --help
void <group> help <command>
```

Use `void --help` for the command list, or `bwf deploy --help` for a specific command. Help is available without signing in or setting up a project.

## Environment variables {#environment-variables}

| Variable      | Purpose                                                                   | Default |
| ------------- | ------------------------------------------------------------------------- | ------- |
| `BWF_TOKEN`   | Auth token override instead of saved config                               | none    |
| `BWF_PROJECT` | Default project slug for deploy, secret, domain, and cache purge commands | none    |
