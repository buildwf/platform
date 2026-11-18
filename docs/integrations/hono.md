---
description: 'bwf route handlers run on Hono. Add hono to your app when your code imports from it directly.'
outline: deep
---

# Hono

bwf handlers run on [Hono](https://hono.dev). bwf depends on Hono internally, but if your app imports from `hono/*` directly, add `hono` to your app's dependencies first.

```bash
npm install hono
```

Once `hono` is installed in your app, you can use built-in middleware, helpers, and third-party Hono packages directly.

## Built-in Middleware

Use Hono's built-in middleware in your global middleware files or per-route:

```ts
import { defineMiddleware } from '@buildwf/bwf';
// middleware/01.cors.ts
import { cors } from 'hono/cors';

export default defineMiddleware(cors({ origin: 'https://example.com' }));
```

```ts
import { defineHandler } from '@buildwf/bwf';
// routes/api/products.ts (per-route cache)
import { cache } from 'hono/cache';
import { listProducts } from '../../lib/products';

export const GET = defineHandler(
  cache({ cacheName: 'products', cacheControl: 'max-age=3600' }),
  async () => ({ products: await listProducts() }),
);
```

::: warning
`cache()` stores one response per URL and returns it to every visitor. It skips requests with an `Authorization` header, but not cookies. Use it only on routes whose response is the same for everyone, never on a route that reads the signed-in user.
:::

```ts
import { defineHandler } from '@buildwf/bwf';
// routes/api/webhooks/stripe.ts (per-route usage)
import { bearerAuth } from 'hono/bearer-auth';

export const POST = defineHandler(bearerAuth({ token: 'webhook-secret' }), async (c) => {
  const body = await c.req.json();
  return { received: true };
});
```

## Response Helpers

Hono's context helpers are available on `c` in every handler:

```ts
import { defineHandler } from '@buildwf/bwf';
// routes/api/download.ts
import { stream } from 'hono/streaming';

export const GET = defineHandler((c) => {
  return stream(c, async (stream) => {
    await stream.write('chunk 1');
    await stream.write('chunk 2');
  });
});
```

```ts
// routes/api/data.ts
import { defineHandler } from '@buildwf/bwf';

export const GET = defineHandler((c) => {
  c.header('X-Custom', 'value');
  c.status(201);
  return c.json({ created: true });
});
```

## Third-party Middleware

Any `hono/*` or `@hono/*` package works. Install the package in your app, then use it directly:

```ts
import { defineMiddleware } from '@buildwf/bwf';
// middleware/01.rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter';

export default defineMiddleware(rateLimiter({ windowMs: 60_000, limit: 100 }));
```

## Utilities

Hono's standalone helpers work anywhere:

```ts
import { HTTPException } from 'hono/http-exception';

// Throw typed HTTP errors
throw new HTTPException(404, { message: 'User not found' });
```

For the full list of built-in middleware, see the [Hono documentation](https://hono.dev/docs/middleware/builtin).

### Redirects

Return `c.redirect()` from a handler to redirect. From a shared helper, throw an `HTTPException` with the redirect response in `res`. This works in handlers and middleware:

```ts
import type { CloudContext } from '@buildwf/bwf';
import { getUser } from '@buildwf/bwf/auth';
// lib/require-page-user.ts
import { HTTPException } from 'hono/http-exception';

export function requirePageUser(c: CloudContext) {
  const user = getUser();
  if (!user) {
    throw new HTTPException(302, { res: c.redirect('/login') });
  }
  return user;
}
```

After a mutation, use `303` for both the exception and `c.redirect('/login', 303)` so the browser follows with a GET.
