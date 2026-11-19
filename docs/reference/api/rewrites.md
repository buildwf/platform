---
description: 'Serve another route without changing the browser URL, and read the URL that was originally requested.'
outline: deep
---

# Rewrites {#rewrites}

URL rewrites re-dispatch a request at a different internal path without changing the browser's URL. `c.rewrite()`, `c.originalUrl()`, and `c.isRewritten()` are available on every Hono `Context` the bwf runtime hands you. See the [Rewrites guide](../../guide/edge/rewrites.md) for the full overview, including static `routing.rewrites` / `routing.fallbacks` in [`bwf.config.ts`](../config.md#routing).

## `c.rewrite(destination)` {#c-rewrite-destination}

Re-dispatches the current request at `destination` and returns the resulting `Response`. The browser URL does not change — this is a server-side hop. If `destination` has no query string, the original request query is preserved. If `destination` includes a query string, it replaces the original query. `destination` must start with `/`; known generated routes autocomplete via [`RewriteDestination`](#rewritedestination), while arbitrary strings remain accepted for dynamic paths.

Pass a [`RouteDestination`](./types.md#route-types) object to check the route pattern and its parameters:

```ts
return c.rewrite({
  pathname: '/users/[id]',
  params: { id: 42 },
  query: { tab: 'activity' },
});
```

With [`routing.typedRoutes`](../config.md#routing-typedroutes), a string destination must be a [`RouteUrl`](./types.md#route-types): a URL that matches one of your routes. Cast a path built at runtime, such as ``c.rewrite(`/${locale}${path}` as RouteUrl)``.

With [`routing.typedRoutes`](../config.md#routing-typedroutes), `c.redirect()` checks strings like a link: route URLs, same-page queries and hashes, and `http://`, `https://`, `mailto:`, or `tel:` URLs. It also accepts a `URL` or typed destination object.

For a string TypeScript can't check, such as a payment provider's checkout URL, use `as Href`:

```ts
import { routeUrl, type Href } from '@builtbyfriends/bwf/routes';

declare const checkoutUrl: string;

return c.redirect(routeUrl('/users/[id]', { params: { id: 42 } }));
return c.redirect({ pathname: '/users/[id]', params: { id: 42 } });
return c.redirect('https://example.com/login');
return c.redirect(checkoutUrl as Href);
```

A cast skips the type check; bwf doesn't validate redirect destinations at runtime. For request values such as `?redirectTo=`, check the origin before redirecting:

```ts
const requested = new URL(c.req.query('redirectTo') ?? '/', c.req.url);
return c.redirect(requested.origin === new URL(c.req.url).origin ? requested : '/');
```

`c.redirect()` sends the location you provide without adding the request query. From `/sign-in?redirectTo=/notes`, `c.redirect('/notes')` goes to `/notes`. Configured [`routing.redirects`](../../guide/edge/redirects.md) merge query parameters instead.

```ts
import { defineHandler } from '@builtbyfriends/bwf';

export const GET = defineHandler((c) => {
  const locale = c.req.header('accept-language')?.startsWith('de') ? 'de' : 'en';
  return c.rewrite(`/${locale}${new URL(c.req.url).pathname}`);
});
```

**Signature:**

```ts
interface CloudContext {
  // RouteUrl instead of RewriteDestination with routing.typedRoutes
  rewrite(destination: RewriteDestination | RouteDestination): Promise<Response>;
}
```

**Caveats:**

- `destination` must start with a single `/` and point at an internal path. External URLs, protocol-relative destinations (`//host/...`), and anything non-path-absolute throw immediately — use `fetch()` for cross-origin calls.
- Destinations whose final path segment ends in a known static-asset extension (e.g. `/hero.png`, `/app.css`, `/data.json`) throw `BwfAssetRewriteError` (exported from `"nosam"`) before the re-dispatch. Runtime rewrites cannot reach assets — use a static `routing.rewrites` rule or a `_redirects` `200!` entry. `.html` is deliberately excluded from this guard because `.html` paths may be legitimate route handlers. See [Rewrites](../../guide/edge/rewrites.md#runtime-rewrites-cannot-reach-static-assets).
- Middleware re-runs on every rewrite hop. Guard side-effects with [`c.isRewritten()`](#c-originalurl-c-isrewritten).
- Client-side SPA navigation does not trigger server rewrites; only full HTTP requests do.

## `c.originalUrl()` / `c.isRewritten()` {#c-originalurl-c-isrewritten}

Context methods for inspecting rewrite state. `c.originalUrl()` returns the pre-rewrite URL as a `URL` object, or `null` on the first, non-rewritten hop. `c.isRewritten()` returns `true` on any re-dispatched context and `false` on the original. Use them for both static and middleware rewrites.

```ts
import { defineMiddleware } from '@builtbyfriends/bwf';

export default defineMiddleware(async (c, next) => {
  if (!c.isRewritten()) {
    // Only log the user-visible request, not internal rewrite hops.
    console.log(`${c.req.method} ${c.req.path}`);
  }
  await next();
});
```

**Signature:**

```ts
interface CloudContext {
  originalUrl(): URL | null;
  isRewritten(): boolean;
}
```

## `RewriteDestination` {#rewritedestination}

```ts
import type { RewriteDestination } from '@builtbyfriends/bwf/routes';
```

Suggests known route patterns in your editor while also accepting dynamic strings. Used as:

- The parameter type of [`c.rewrite()`](#c-rewrite-destination), unless `routing.typedRoutes` is on.
- The type of `destination` entries in `routing.rewrites` and `routing.fallbacks` in [`bwf.config.ts`](../config.md#routing).

Like [`RouteMap`](./types.md#routemap), `RewriteDestination` lives in the virtual `@builtbyfriends/bwf/routes` module and is refreshed whenever routes change.
