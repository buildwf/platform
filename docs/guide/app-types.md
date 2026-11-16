---
description: 'Build a Void app (a React single-page app with an optional backend) or deploy a static SPA or static site.'
outline: deep
---

# Supported App Types

Void supports two kinds of apps, both deployed to Cloudflare:

1. **Void apps:** a React single-page app (`index.html` + `src/`) with an optional backend in `routes/`, plus [auth](./auth.md), [crons](./jobs.md), [queues](./queues.md), and the other Void features
2. **Static apps:** a pre-built SPA, a site built with a tool like [VitePress](https://vitepress.dev/), or any directory of static files

The type is auto-detected from your project structure, or you can set it explicitly in [`void.config.ts`](../reference/config.md).

## Void Apps

A Void app is a React single-page app that Vite builds into static assets. The browser renders every page; Void does not render HTML on the server. Add files to `routes/` when the app needs a backend:

<VoidAppFileTree annotations />

Void serves the API routes from a Cloudflare Worker alongside the SPA's assets. Unknown paths serve `index.html`, so client-side routing works. Resources such as D1, KV, and R2 are [inferred from your code](../reference/resource-inference.md) and provisioned when you deploy.

A Void app without `routes/`, middleware, or other server features is a plain SPA: it deploys as static assets with no Worker.

**Deploy:** `void deploy` builds the app, provisions resources, applies migrations, and uploads it to your saved Cloudflare or Void target. See [Deployment](./deployment.md) for setup.

## Pre-built Static Apps

Any project that produces static files, whether that is an SPA, a static site, or a plain directory. Void serves the assets without requiring application code.

**SPAs** (client-side single-page apps) serve `index.html` with a 200 status for paths that match no file, so client-side routing works out of the box. On a Void platform, missing files under the hashed assets folder (`/assets/`) return 404 instead. Detected when `vite` is a dependency and no backend files exist.

**Static sites** (static site generators like VitePress, Docusaurus, or any pre-built directory) produce per-page HTML files. Detected when a known SSG is a dependency, or when using the `--dir` flag.

At the edge, the resolution order is:

1. Exact file path (`/styles.css` → `styles.css`)
2. Nested index (`/about` → `about/index.html`)
3. `404.html` with **status 404** (if the file exists)
4. Plain 404 response

**Deploy:** `void deploy` or `void deploy --dir <path>` uploads static files directly. Assets are served from the edge with automatic caching.

## Adding a backend to a static site

If you add API routes to a static site generator, tell Void whether to deploy the backend too. Auto-detection sees both the SSG dependency and backend files, and stops until you set `inference.appType`.

To deploy both, set `appType` to `"void"` and build the static site before the Void app:

```ts
import { defineConfig } from 'void/config';

export default defineConfig({
  inference: {
    appType: 'void',
    build: 'vitepress build && vite build',
  },
});
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin()],
  // The SSG's output becomes the static assets of the Void build.
  publicDir: '.vitepress/dist',
});
```

`vitepress build` emits the site, then `vite build` copies `publicDir` into `dist/client` and emits the worker into `dist/ssr`. Keep `voidPlugin()` in the **root** `vite.config.ts` only — not in the generator's own config (e.g. `.vitepress/config.ts`).

The Worker handles unmatched requests. Set [`routing.notFound`](../reference/config.md#routing-notfound) to serve the generator's `404.html` for those requests:

```json
{ "routing": { "notFound": "404-page" } }
```

To deploy only the static output, set:

```json
{ "inference": { "appType": "static" } }
```

## Explicit Configuration

To lock the app type and skip auto-detection, set `inference.appType` in [`void.config.ts`](../reference/config.md):

```json
{
  "inference": {
    "appType": "static",
    "outputDir": ".vitepress/dist"
  }
}
```

- `inference.appType`: `"void"`, `"spa"`, or `"static"`
- `inference.outputDir`: output directory for static app types (relative to project root, defaults to `"dist"`)
