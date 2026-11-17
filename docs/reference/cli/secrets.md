---
description: 'List, set, and remove production secrets. Secret values are never printed.'
outline: deep
---

# Secrets and Environment {#secrets}

## `nosam secret list` {#nosam-secret-list}

```
nosam secret list [--project <name>]
```

List production secret names for the saved target. Secret values are never printed. Direct Cloudflare targets query the Worker named in `nosam.config.ts`; `--project` is hosted-only.

## `nosam secret put` {#nosam-secret-put}

```
nosam secret put <name> [--project <name>]
nosam secret put <name=value> [--project <name>]
```

Value input modes:

- inline: `nosam secret put API_KEY=abcd`
- prompt (TTY): `nosam secret put API_KEY` (masked input)
- stdin: `echo -n "abcd" | nosam secret put API_KEY`

On a direct Cloudflare target, the value is stored as an encrypted Worker secret.

## `nosam secret sync` {#nosam-secret-sync}

```
nosam secret sync <file> [--project <name>] [--yes]
```

Upload production server values from a dotenv file stored outside your project. Include only keys declared in `env.ts`; leave out local development credentials and public `VITE_*` values.

```sh
nosam secret sync /secure/path/production.env
```

Pass `--yes` to skip confirmation in scripts and CI.

Existing remote secrets absent from the file are kept. Every entry must be a server key declared in `env.ts`, and its value must pass validation.

## `nosam secret delete` {#nosam-secret-delete}

```
nosam secret delete <name> [--project <name>]
```

Secret commands use the platform saved in `.nosam/project.json`. Hosted project resolution follows the same order as deploy (`--project`, env var, linked project). Direct Cloudflare targets reject `--project` and use the pinned root Cloudflare config.

On hosted projects, secret writes and deletes return a retryable conflict while a deployment or rollback is in progress. Wait for that operation to finish and retry; the rejected operation leaves the stored secret unchanged.

## Env Schema {#env-schema}

### `nosam env check` {#nosam-env-check}

```
nosam env check [--remote]
```

Without `--remote`, validate `.env` plus the shell for local development. With `--remote`, validate build-shell client values and the remote server-secret names. Exits non-zero if a required key is missing or a readable value is invalid.

### `nosam env types` {#nosam-env-types}

```
nosam env types
```

Regenerate `.nosam/env.d.ts` from `env.ts`. Normally happens automatically on dev server start and HMR; use this command after a fresh clone or to refresh stale types in non-dev contexts.

::: tip Deploy validation
`nosam deploy` runs the same schema validation automatically (with remote secrets) and refuses to upload if any required key is missing — no need to call `env check` separately when deploying.
:::

See [Environment Variables](../../guide/env-vars.md) for the full guide.
