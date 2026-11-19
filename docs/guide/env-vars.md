---
description: 'Declare environment variables in env.ts and read the typed values from bwf/env. Use .env locally and secrets in production.'
---

# Environment variables

Declare your environment variables in `env.ts`, then read them through `env` from `@builtbyfriends/bwf/env`. Use `.env` for local values and `bwf secret put` for production server values.

## Define the schema

Create `env.ts` at the project root:

```ts
import { defineEnv, number, string, url } from '@builtbyfriends/bwf/env';

export default defineEnv({
  DATABASE_URL: url(),
  STRIPE_KEY: string(),
  PORT: number().default(3000),
  VITE_API_ORIGIN: url(),
});
```

Import the typed `env` object in your app:

```ts
import { env } from '@builtbyfriends/bwf/env';

const databaseUrl = env.DATABASE_URL;
```

The built-in helpers are `string()`, `number()`, `boolean()`, `url()`, `email()`, `oneOf([...])`, and `json<T>()`. They support `.optional()` and `.default(value)`. Any [Standard Schema](https://standardschema.dev/) validator can also be used directly.

Defaults are source-code constants. They are appropriate for non-sensitive fallback behavior; do not put credentials in a default.

## Local development

Put local values in a single root `.env` file:

```ini
DATABASE_URL=postgres://localhost/my-app
STRIPE_KEY=sk_test_example
VITE_API_ORIGIN=http://localhost:5173
```

An unquoted value ends at `#`, which starts a comment. Quote a value that contains `#`, such as `DATABASE_URL="postgres://user:p#ss@localhost/my-app"`.

Keep `.env` out of Git. Other dotenv files, including `.env.local`, `.env.production`, `.env.example`, and Wrangler’s `.dev.vars*`, are not supported.

Names starting with `__PLATFORM_` are reserved for bwf. bwf stops with an error if `.env` or `env.ts` defines one.

Run the local check at any time:

```sh
bwf env check
```

Local database, migration, auth, and dev-server tooling all read the same `.env` file. Shell values override it.

## Production server values

Every schema key that is not client-prefixed is a server value. Set it remotely:

```sh
bwf secret put DATABASE_URL
bwf secret put STRIPE_KEY
```

For bulk upload, prepare a dotenv-formatted file containing only production server values:

```sh
bwf secret sync production-secrets.txt
```

Secret commands validate values against `env.ts` before upload. Production values are encrypted and validated again at Worker startup.

Client-prefixed keys are rejected by secret commands. Keep local development credentials and `VITE_*` values out of the production secrets file.

`bwf deploy` requires every required server key to exist remotely. It never uploads `.env` values.

The same secret commands work for direct Cloudflare deployments. Schema-declared server values must be Worker secrets, not plaintext `vars`.

## Client values

Keys beginning with `VITE_` are client values, even if your framework customizes Vite's `envPrefix`.

Client values are embedded in browser JavaScript and are never secrets. Supply them through the build shell or use a schema default:

```sh
VITE_API_ORIGIN=https://api.example.com bwf deploy
```

```ts
export default defineEnv({
  VITE_API_ORIGIN: url().default('https://api.example.com'),
});
```

Builds ignore client values from `.env`; this prevents a developer's local value from silently becoming production configuration.

Server rendering uses the same public build values as the browser.

## Validation and redaction

```sh
bwf env check           # validate .env + shell for local development
bwf env check --remote  # validate build-time client values and remote server names
bwf env types           # regenerate .bwf/env.d.ts
```

Invalid-value diagnostics redact the supplied value by default. Set `BWF_ENV_UNMASK=1` only for deliberate local debugging; bwf prints a notice when redaction is disabled.

## Imports inside `env.ts`

Use relative imports or package names inside `env.ts`. TypeScript path aliases and imports that need Vite transforms are not supported.
