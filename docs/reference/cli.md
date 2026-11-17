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

`nosam` is a local binary from the installed `nosam` package.

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

Platform administrators can also choose AI Gateway logging [per project](./cli/platform-users.md#ai-gateway-logging) with `nosam platform project ai-logging`, or [per plan](../guide/platform/administration/plans.md#ai-gateway-logging) with `nosam platform config plans`.

| Command                           | Purpose                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `nosam deploy`                     | Build and deploy to the configured platform                                   |
| `nosam deploy --skip-migrations`   | Deploy code without applying application or authentication SQL migrations     |
| `nosam prepare`                    | Generate `.nosam` artifacts without starting Vite                              |
| `nosam info [--json]`              | Inspect persistent resource names before moving their code                    |
| `nosam gen model <name> [cols...]` | Scaffold a Drizzle table and API routes                                       |
| `nosam gen route <path>`           | Create an API route                                                           |
| `nosam db push`                    | Apply schema directly without migration files                                 |
| `nosam db generate`                | Generate SQL migrations from schema changes                                   |
| `nosam db status`                  | Show local/remote migration status                                            |
| `nosam db reset`                   | Drop and re-apply all migrations                                              |
| `nosam db seed`                    | Reset + seed local database                                                   |
| `nosam db execute <sql>`           | Run SQL against the database (--remote for deployed)                          |
| `nosam db studio`                  | Open Drizzle Studio (--remote for a deployed external database)               |
| `nosam db restore --bookmark <b>`  | Restore the deployed D1 database to a restore point (direct Cloudflare)       |
| `nosam secret put <name=value>`    | Set a production secret                                                       |
| `nosam secret list`                | List production secrets                                                       |
| `nosam secret sync <file>`         | Bulk upload secrets from dotenv file                                          |
| `nosam env check [--remote]`       | Validate env.ts schema                                                        |
| `nosam env types`                  | Regenerate .nosam/env.d.ts from env.ts                                         |
| `nosam auth login`                 | Authenticate with the project’s saved destination, or choose one              |
| `nosam account login`              | Authenticate with a Nosam platform                                            |
| `nosam cloudflare login`           | Authenticate with Cloudflare through Nosam                                    |
| `nosam platform install`           | Install a company Nosam platform in Cloudflare                                |
| `nosam connect <url>`              | Connect the CLI to a Nosam platform; hostnames default to HTTPS               |
| `nosam project link`               | Link directory to a project                                                   |
| `nosam project logs`               | Show runtime logs from deployed project                                       |
| `nosam project requests`           | Show request-level traffic (status, method, timing)                           |
| `nosam project rollback`           | Roll back to a previous deployment                                            |
| `nosam project cancel`             | Cancel an active deployment                                                   |
| `nosam project zero-trust`         | Inspect or override project Zero Trust protection                             |
| `nosam build logs`                 | Stream, tail, or download build logs                                          |
| `nosam email status`               | Show email readiness on your own Cloudflare account (`--platform cloudflare`) |
| `nosam email setup`                | Set email up on your own Cloudflare account, without deploying                |
| `nosam email usage`                | Show monthly recipient attempts, inbound receipts, and quota                  |
| `nosam email logs`                 | Show recent email delivery activity                                           |
| `nosam email destinations`         | List verified recipient addresses                                             |
| `nosam email allow <address>`      | Add a recipient and send a verification email                                 |
| `nosam email disallow <address>`   | Remove a recipient from the allowlist                                         |
| `nosam email alias [name]`         | Show the shared mail address, or give it a shorter permanent name             |
| `nosam email domain`               | Send and receive at your own domain on a Cloudflare zone                      |
| `nosam init`                       | Set up a new or existing project, including coding agents                     |
| `nosam migrate`                    | Update project configuration                                                  |

## Binary Invocation {#binary-invocation}

The docs use `nosam` for brevity. Outside package scripts, run it with your package manager: `npx nosam`, `pnpm void`, `yarn void`, `bunx nosam`, or `vpx void`.

The CLI needs Node.js 24.22+ or 26.12+. `npx`, `bunx` and package scripts use the `node` on your `PATH`; `vpx` uses the version in `.node-version`.

Alternatively, you can add `./node_modules/.bin` to your `PATH` so that you can invoke `nosam` directly when you are in the root directory of your app.

:::warning ⚠️ Prefer local install
Install `nosam` in your project so the CLI and runtime use the same version.
:::

## Help {#help}

```
void --help
nosam help
nosam help <command>
nosam help <group> <command>
void <command> --help
void <group> <command> --help
void <group> help <command>
```

Use `void --help` for the command list, or `nosam deploy --help` for a specific command. Help is available without signing in or setting up a project.

## Environment variables {#environment-variables}

| Variable       | Purpose                                                                   | Default |
| -------------- | ------------------------------------------------------------------------- | ------- |
| `NOSAM_TOKEN`   | Auth token override instead of saved config                               | none    |
| `NOSAM_PROJECT` | Default project slug for deploy, secret, domain, and cache purge commands | none    |
