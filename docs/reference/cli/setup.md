---
description: 'Create a project with nosam init, prepare generated files, and inspect inferred resources.'
outline: deep
---

# Project Setup {#setup}

## `nosam info` {#nosam-info}

```sh
nosam info
nosam info --json
```

Shows each Durable State and WebSocket definition's source file, inferred or explicit name, Worker class, and binding. WebSocket entries also include their route in JSON output. It runs locally without authentication, network requests, or file generation.

Before moving a deployed definition, copy the suggested `name` into `defineDurableState()`, `defineRoom()`, or `defineWebSocket()`. Keep that name after moving the file to preserve the resource. See [Durable State](../../guide/durable-state.md#rename-a-file-while-keeping-its-state) and [WebSockets](../../guide/websockets.md#move-a-route-while-keeping-its-state) for migration flows, including WebSocket parameter renames.

Resources recorded in `nosam.lock.json` without a matching definition appear separately. Adopt a suggested name only after identifying the resource you moved. If Nosam cannot suggest a name, restore its original source and inspect it before moving it again.

`--json` returns `resources` and `recordedResources`. Current entries contain `file`, `definition`, `name`, `nameSource` (`inferred` or `explicit`), `className`, `bindingName`, and an optional `route`. Recorded entries contain `className` and `bindingName`, with `name` and `definition` when a matching name is available.

## `nosam migrate` {#nosam-migrate}

`nosam migrate` converts legacy `nosam.json` and root `wrangler.jsonc` or `wrangler.json` files into `nosam.config.ts`. It also accepts one root `wrangler*.json(c)` file referenced by a supported framework adapter. Nosam saves backups in `.nosam/config-migration/`, records resource IDs in `nosam.lock.json`, and updates supported adapters to use its generated Cloudflare config.

The command adds generated `.cloudflare/` and `.nosam-wrangler.jsonc` files to `.gitignore` as needed. Review and commit `nosam.config.ts`, `nosam.lock.json`, and `.gitignore`. `nosam init` and `nosam deploy` migrate legacy files automatically. Resolve conflicting Cloudflare configs first, and keep the project's `nosam` package and CLI on the same version.

## `nosam init` {#nosam-init}

```sh
nosam init [--tsconfig] [--github] [--git | --no-git]
          [--toolchain <name>] [--framework <name>] [--starter <name>] [--deploy <target>]
```

Set up a new or existing Nosam project. In an empty directory, choose Vite+ or Vite and a D1, PostgreSQL, MySQL, or SPA-only React starter. The new app's `nosam.config.ts` turns on [`routing.typedRoutes`](../config.md#routing-typedroutes).

Pass your choices as flags to scaffold from a script or coding agent:

| Flag          | Values                                 |
| ------------- | -------------------------------------- |
| `--toolchain` | `vite-plus`, `vite`                    |
| `--framework` | `react`                                |
| `--starter`   | `sqlite`, `postgresql`, `mysql`, `spa` |
| `--deploy`    | `cloudflare`, `nosam`, `none`           |

```sh
nosam init --toolchain vite-plus --starter sqlite --deploy none
npm create nosam@latest my-app -- --toolchain vite-plus --starter sqlite --deploy none
```

For non-interactive scaffolding, choose `--deploy none` and run `nosam connect` later to sign in.

Vite+ projects install dependencies through `vp install`; no global Vite+ installation is required. Nosam preserves existing package-manager versions and lockfiles. New Vite+ projects without a package-manager configuration use pnpm without pinning a version.

In an existing app, Nosam adds missing dependencies and scripts and updates the Vite config. If it cannot edit your config, it prints the snippet to add.

The wizard also sets up TypeScript, agent instructions, environment declarations, and a deployment target. Choose Cloudflare, a Nosam platform, or skip deployment setup. If you skip sign-in, run `nosam connect` when you're ready. See [Quick Start](../../guide/quickstart.md).

Every init run sets up coding agents. New projects get a minimal `AGENTS.md`
pointing to `node_modules/nosam/docs/`. Existing projects prompt before the file
is created, appended to, or updated; CI and non-interactive runs leave existing
projects' instructions unchanged. Skills are linked for detected agents. See
[Coding Agents](../../integrations/agents.md).

Outside an existing repository or workspace package, Nosam offers to initialize Git. Use `--git` to initialize without a prompt or `--no-git` to skip it. CI requires `--git` to initialize. Workspace packages do not accept these flags.

Run selected setup steps with:

| Flag         | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `--tsconfig` | Update TypeScript configuration, preserving existing settings. |
| `--github`   | Create the GitHub Actions deployment workflow.                 |

These flags can be combined and skip the other wizard steps. Coding agent setup
still runs. Add `--git` if you also want Git initialization.

For Cloudflare workflows, add a `CLOUDFLARE_API_TOKEN` repository secret. PostgreSQL and MySQL apps also need `DATABASE_URL`.

Nosam platforms with GitHub Actions support use short-lived OIDC credentials. Authorize the repository with `nosam github connect <project> --repo <owner/repo> --executor github_actions`. Core self-hosted platforms do not support that integration. See [Deployment](../../guide/deployment.md#github).

## `nosam prepare` {#nosam-prepare}

```
nosam prepare
```

Generates Nosam’s types and TypeScript configuration without starting the dev server or building the app. Run it after a fresh clone or before typechecking in CI.
