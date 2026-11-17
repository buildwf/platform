---
description: 'Add Nosam to Vite. The plugin sets up routing, migrations, and the Cloudflare Workers runtime.'
outline: deep
---

# Plugin and Configuration {#plugin}

## `nosamPlugin(options?)` {#voidplugin-options}

Named export from `"nosam"`. Returns an array of Vite plugins that set up file-based routing, migration support, and the Cloudflare Workers runtime. Application-level configuration is read from [`nosam.config.ts`](../config.md); the optional `options` object controls Vite/Cloudflare plugin behavior.

```ts
import { nosamPlugin } from 'nosam';

export default defineConfig({
  plugins: [nosamPlugin()],
});
```

| Option             | Type                      | Description                                                                                                                                                                                                                                 |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `persistTo`        | `string`                  | Directory path for persisting local dev state (D1, KV, R2). Defaults to `.nosam/` in the project root.                                                                                                                                       |
| `auxiliaryWorkers` | `AuxiliaryWorkerConfig[]` | Additional Workers to run alongside your app, such as a separate API Worker and dashboard that share bindings. Each entry accepts `configPath` (JSON, JSONC, or TOML), `config` (settings or a callback), `viteEnvironment`, and `devOnly`. |

## Project configuration {#project-configuration}

### `defineConfig(config)` {#defineconfig-config}

Import from `nosam/config` in the root `nosam.config.ts`. It returns the config with editor completion and TypeScript checking. Nosam validates the result when loading it, including values computed at runtime.

```ts
import { defineConfig } from 'nosam/config';

export default defineConfig({
  cloudflare: { name: 'my-app' },
  routing: { typedRoutes: true },
});
```

See the [config reference](../config.md) for all fields.
