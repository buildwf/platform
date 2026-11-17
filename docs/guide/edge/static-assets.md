---
description: "Cache static assets on Cloudflare's edge. Hashed build files stay reusable across deploys."
outline: deep
---

# Static Assets Caching

Nosam caches static assets on Cloudflare's edge network. Hashed build files can be reused across deploys, while other files use cache keys tied to the deployment.

## Hashed assets

Files in Vite's `build.assetsDir` (default `assets/`) are produced with content hashes in the filename, such as `assets/app-Ab3xK9.js`. These files are immutable because the filename changes whenever the content changes, so they get aggressive caching:

```
Cache-Control: public, max-age=31536000, immutable
```

Browsers and the edge can cache these files for one year and reuse them across deploys.

If your Vite config customizes `build.assetsDir`, Nosam automatically detects this and applies the immutable optimization to the configured directory:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    assetsDir: 'static', // hashed assets go to dist/client/static/
  },
});
```

If `build.assetsDir` is set to `""`, meaning hashed files live at the root, the optimization is skipped because there is no directory-based way to distinguish hashed from non-hashed files.

### Native Cloudflare deployments

For Nosam apps, `void deploy --platform cloudflare` gives generated JavaScript bundles with content fingerprints immutable caching. Files copied from `public/` and custom build outputs with stable filenames keep normal revalidation, even when they live in the assets directory. CSS and other assets keep Cloudflare's default or your configured `Cache-Control`.

Use [Custom Headers](./headers) to choose a cache policy for other files. Apply immutable caching only to URLs that change whenever their content changes.

## Non-hashed assets

Other static files, such as `index.html` and `favicon.ico`, are cached until the next deploy. You do not need to purge them manually.

```
Cache-Control: public, s-maxage=31536000, max-age=0, must-revalidate
```

Browsers revalidate these files on each request.

**What gets cached:**

- All `GET` requests for static projects such as SPAs and static sites
- GET requests with file extensions (`.ico`, `.png`, `.css`, etc.) in Nosam apps with a Worker

**What does NOT get cached:**

- `/api/*` routes, which always hit the worker
- Paths without file extensions in Nosam apps with a Worker
- Non-GET requests
- Requests carrying `Cookie`, `Authorization`, or `Cf-Access-Jwt-Assertion` credentials
- Responses other than a complete `200`

### Opting out

If your worker serves dynamic content at a URL that looks static (e.g., a dynamically generated image at `/avatar.jpg`), you can prevent caching by setting `Cache-Control: private` or `Cache-Control: no-store` in your response headers. Any response with `Cache-Control` containing `private`, `no-store`, or `no-cache`, or with a `Set-Cookie` header, bypasses the edge cache.

## ETags and 304 Not Modified

Static assets include an `ETag` header. When a browser revalidates an unchanged file, Nosam returns `304 Not Modified` without downloading it again. No configuration is needed.

## Custom headers

You can override caching headers or add your own for any static asset path using [Custom Headers](./headers).

## Navigation and middleware

Nosam serves static files directly unless application code needs to handle the request first. API requests reach your Worker. Apps with middleware or routes outside `/api` run application code before serving fallback HTML.

SPAs serve `index.html` for unmatched HTML navigation so client-side routing works. For a static site with a `404.html` page, set [`routing.notFound`](../../reference/config.md#routing-notfound):

```ts
import { defineConfig } from 'void/config';

export default defineConfig({
  routing: { notFound: '404-page' },
});
```

Choose `single-page-application`, `404-page`, or `none`. These settings preserve which requests reach middleware and API handlers. Intentional API `404` responses keep their status and body.

To run server code before serving an asset, set [`run_worker_first`](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first) under `cloudflare.assets` in `void.config.ts`. Setting it to `true` runs the Worker on every request and counts toward Worker request usage.

## API routes

API responses are not cached as static assets. Set `Cache-Control` in the handler to let browsers cache them.
