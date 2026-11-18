---
description: 'bwf detects the Cloudflare resources your code uses and provisions the matching bindings. Manual configuration is optional.'
outline: deep
---

# Resource Inference

bwf automatically detects which Cloudflare resources your project uses by scanning source files at startup. In most cases, there is no manual configuration. Use a resource in code, and bwf provisions the matching binding for local development.

## Detected Bindings

| Binding          | Type                       | Detected by import                                                                                                      | Detected by env access                                                         |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DB`             | `D1Database`               | `import { db } from "@buildwf/bwf/db"`                                                                                  | `env.DB` or `c.env.DB`                                                         |
| `KV`             | `KVNamespace`              | `import { kv } from "@buildwf/bwf/kv"`                                                                                  | `env.KV` or `c.env.KV`                                                         |
| `STORAGE`        | `R2Bucket`                 | `import { storage } from "@buildwf/bwf/storage"`                                                                        | `env.STORAGE` or `c.env.STORAGE`                                               |
| `AI`             | `Ai`                       | `import { ai } from "@buildwf/bwf/ai"`                                                                                  | `env.AI` or `c.env.AI`                                                         |
| `SANDBOX`        | Managed Sandbox capability | `import { getSandbox } from "@buildwf/bwf/sandbox"`                                                                     | `getSandbox()`; native Cloudflare also exposes `env.SANDBOX` / `c.env.SANDBOX` |
| Auth             | none                       | `import { ... } from "@buildwf/bwf/auth"` or `import { auth } from "@buildwf/bwf/client"` / `@buildwf/bwf/client/react` | none                                                                           |
| `QUEUE_*`        | `Queue`                    | `import { queues } from "@buildwf/bwf/queues"`                                                                          | `env.QUEUE_*`                                                                  |
| `BWF_LIVE`       | `DurableObjectNamespace`   | `import { defineLiveStream } from "@buildwf/bwf/live"`                                                                  | n/a                                                                            |
| filename-derived | `DurableObjectNamespace`   | A default-exported `defineDurableState()` module in `durable-objects/`                                                  | n/a                                                                            |

Auth detection also triggers when importing the `auth` specifier from `@buildwf/bwf/client` or a framework-specific client subpath such as `@buildwf/bwf/client/react` (but not when importing only `fetch`).

Static bracket access such as `c.env['KV']` and destructured properties such as
`const { DB, KV: cache } = c.env` are also detected. For keys chosen at runtime,
use [explicit binding overrides](#explicit-binding-overrides).

Durable state is inferred from files in `durable-objects/`. For example, `durable-objects/shopping-cart.ts` creates the `SHOPPING_CART` binding, exports `ShoppingCartDurableObject`, and records its migration. See [Durable State](../guide/durable-state.md).

## Scanned Directories

bwf apps scan these directories by default. With [`sourceDir`](./config.md#sourcedir) configured, bwf scans that source tree instead:

| Directory     | Contains               |
| ------------- | ---------------------- |
| `routes/`     | API route handlers     |
| `middleware/` | Hono middleware        |
| `queues/`     | Queue consumers        |
| `crons/`      | Scheduled job handlers |
| `email/`      | Inbound email handlers |
| `src/`        | Application source     |

### Always scanned

Regardless of mode, these are always checked:

- **Application source** in `src/` or your configured `sourceDir`, including resource and auth imports
- **`durable-objects/`**, which is scanned for typed Durable Object state modules in native bwf apps

## Custom Scan Directories

If your project organizes code in non-standard directories, you can override which directories are scanned:

```json
{
  "inference": {
    "scanDirs": ["src", "lib", "workers"]
  }
}
```

Paths are relative to the project root. When `inference.scanDirs` is set, it replaces the default directories entirely. The application source scan still applies.

## Explicit Binding Overrides

Use [`inference.bindings`](./config.md#inference-bindings) to enable, disable, or rename a binding when inference does not match your setup. It overrides only the bindings you name; the rest are still inferred.

## File Types

Inference scans `.ts`, `.tsx`, `.mts`, `.js`, `.jsx`, and `.mjs` files.
