---
description: 'Carry types from your database schema through route handlers to the UI.'
outline: deep
---

# Type Safety

bwf infers types from your database schema and route handlers. When you change a field, TypeScript shows which queries, requests, and components need to change.

## The Type Pipeline

<img src="./type-pipeline.svg" alt="Type pipeline: Drizzle schema flows to DB types, then into route handlers and the typed fetch client" style="max-width: 720px; width: 100%;" />

1. **Database types** come from your [Drizzle schema](./database.md#schema-definition). Column types are known at compile time.
2. **Route handlers:** return types and validator schemas become the generated `RouteMap`, which the [typed fetch](./typed-fetch) client consumes.

All generated types live in `.bwf/` and update automatically when source files or schema change.

## Database → Handler → Client

Types flow from your Drizzle schema through handlers to the client without any manual annotations:

```ts
// routes/api/users.ts
export const GET = defineHandler(async (c) => {
  return db.select({ name: users.name, email: users.email }).from(users);
  //     ↑ return type inferred from schema columns
});

export const POST = defineHandler.withValidator({
  body: insertUserSchema, // ← derived from Drizzle schema
})(async (c, { body }) => {
  return db.insert(users).values(body).returning();
});
```

```ts
// Client: types inferred from handlers above
const users = await fetch('/api/users');
//    ↑ { name: string; email: string }[]

await fetch('/api/users', {
  method: 'POST',
  body: { name: 'Alice', email: 'alice@example.com' }, // ← typed from validator
});
```

The Drizzle schema defines database columns, runtime validation, handler input types, and client-side type checking all at once. For endpoints that don't map to a table, use any [Standard Schema](./server-routing.md#manual-validators) library.

## Typed URLs and Navigation

To build the URL of an API route, pass its route pattern and parameters to `routeUrl()`:

```ts
import { routeUrl } from '@builtbyfriends/bwf/routes';

const url = routeUrl('/api/users/[id]', {
  params: { id: 42 },
  query: { fields: 'name' },
});
// /api/users/42?fields=name
```

TypeScript checks the route and required parameter names. Patterns follow your filenames: `routes/api/users/[id].ts` uses `/api/users/[id]`.

Parameters accept strings or numbers and are URL-encoded for you. Query values can be strings, numbers, booleans, or arrays. Arrays become repeated keys; `null` and `undefined` values are omitted.

The same bracket patterns work with typed `fetch()` and WebSocket `connect()`.

Pass the returned string to `fetch()`, an `<a>`, or `c.redirect()`. For `c.redirect()` and `c.rewrite()`, you can pass a destination object directly:

```ts
import type { RouteDestination } from '@builtbyfriends/bwf/routes';

const user = {
  pathname: '/api/users/[id]',
  params: { id: 42 },
  query: { fields: 'name' },
} satisfies RouteDestination;
```

Destination objects check and encode parameters just like `routeUrl()`. See [Rewrites](../reference/api/rewrites.md#c-rewrite-destination) for server navigation.

For a catch-all route such as `routes/files/[...path].ts`, use `/files/[...path]` and pass the full path as one value:

```ts
routeUrl('/files/[...path]', { params: { path: 'docs/get started' } });
// /files/docs/get%20started
```

For an unnamed catch-all (`[...]`), pass its value under the `'*'` key:

```ts
routeUrl('/files/[...]', { params: { '*': 'docs/get started' } });
// /files/docs/get%20started
```

### Checked URL strings

Enable [`routing.typedRoutes`](../reference/config.md#routing-typedroutes) to catch misspelled URLs in redirects, rewrites, and stream clients. Apps created with `bwf init` already have it enabled. For an existing app:

```ts
// bwf.config.ts
import { defineConfig } from '@builtbyfriends/bwf/config';

export default defineConfig({
  routing: { typedRoutes: true },
});
```

A string must then match one of your routes, optionally followed by a query string or hash:

```ts
c.redirect('/api/health');
c.redirect(`/api/users/${user.id}?fields=name`);
c.redirect('/api/helth'); // Type error: no route matches
```

Redirects also accept same-page queries and hashes (`?page=2`, `#comments`), and `http://`, `https://`, `mailto:`, and `tel:` URLs. Use absolute paths within your app; relative paths such as `../settings` are rejected. Static path segments accept raw text such as `/café menu` or uppercase percent encoding such as `/caf%C3%A9%20menu`.

String checks use TypeScript patterns, which don't validate individual dynamic segments. For example, `/users/[id]` also accepts `/users/` and `/users/42/edit`. A root dynamic route can accept `//example.com`. Prefer `routeUrl()` to encode parameters, and validate untrusted URLs at runtime.

The [SSE](./sse.md#client) and [live stream](./live.md#subscribe-from-the-browser) clients accept route URLs and external `http://` or `https://` URLs. Same-page links, `mailto:`, `tel:`, and `ws://` aren't stream destinations.

`c.redirect()` also accepts a `URL` or destination object. For a URL from a provider SDK, your CMS, or `public/`, use `as Href` to skip the type check:

```ts
import { routeUrl, type Href } from '@builtbyfriends/bwf/routes';

declare const id: string;
declare const dynamic: string;

c.redirect('/about');
c.redirect(routeUrl('/users/[id]', { params: { id } }));
c.redirect({ pathname: '/users/[id]', params: { id } });
c.redirect('https://example.com/login');
c.redirect(new URL('https://example.com/login'));
c.redirect(dynamic as Href);
```

Cast only URLs you trust. Validate request values such as `?redirectTo=` before redirecting; see [`c.redirect()`](../reference/api/rewrites.md#c-rewrite-destination) for an example.

`@builtbyfriends/bwf/routes` exports two types for these strings:

- `RouteUrl`: the URL of one of your routes. `routeUrl()` returns it, and `c.rewrite()` accepts it.
- `Href`: anything `c.redirect()` can point to: a `RouteUrl`, a same-page query or hash, or an external URL.

Use these types for URLs you check at runtime:

```ts
import type { Href, RouteUrl } from '@builtbyfriends/bwf/routes';

c.rewrite(post.path as RouteUrl);
c.redirect(user.website as Href);
```

The dev server keeps route types up to date. After changing `routing.typedRoutes`, restart it or run `bwf prepare`. For CI and standalone typechecking, follow [Setup](#setup). See the [API reference](../reference/api/types.md#platform-routes) for the URL helper and route types.

## What Gets Checked

| Layer        | What's type-checked                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database     | Table columns, value types, insert/update shapes from Drizzle schema                                                                                                                                                  |
| Handlers     | `c.env` bindings, validator input, return type                                                                                                                                                                        |
| Fetch client | Route paths, HTTP methods, `body`/`query`/`params`, response type                                                                                                                                                     |
| Navigation   | Route patterns and required parameter names and values in `routeUrl()` and destination objects                                                                                                                        |
| Rewrites     | With `routing.typedRoutes`, URL strings in `c.rewrite()` and SSE and live stream clients                                                                                                                              |
| `c.redirect` | With `routing.typedRoutes`, route URLs, same-page queries and hashes, destination objects, `URL` values, and `http://`, `https://`, `mailto:`, and `tel:` literals. A string TypeScript cannot check needs `as Href`. |

## Serialization

The typed fetch client reflects JSON serialization:

| Source type or value                                | Client type or behavior                                         |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `string`, `number`, `boolean`, `null`               | unchanged                                                       |
| `Date`                                              | `string`                                                        |
| Arrays and tuples, including readonly types         | recursively serialized, preserving tuple shape and readonly     |
| `undefined`, functions, or symbols in an array      | `null`                                                          |
| `undefined`, functions, or symbols as object values | property omitted                                                |
| Symbol-keyed object properties                      | omitted                                                         |
| `Response`                                          | excluded from the inferred JSON type; passed through at runtime |
| `bigint`                                            | unsupported by JSON                                             |

Object properties whose values may be omitted become optional in the client type. For example, a handler returning `{ label: string | undefined }` produces `{ label?: string }`.

## Context Variables

Middleware and handlers share typed data through Hono's context variables. Augment `CloudContextVariables` to define your own:

```ts
// middleware/01.auth.ts
declare module '@builtbyfriends/bwf' {
  interface CloudContextVariables {
    requestId: string;
  }
}

export default defineMiddleware(async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
});
```

Now `c.get("requestId")` returns `string` everywhere, with no assertion needed. Multiple augmentations across files are [merged together](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).

## Custom Binding Types

For native Cloudflare deployments, declare a binding in `bwf.config.ts` to give `c.env` its type. For example, add a [rate limiter](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/):

```ts
// bwf.config.ts
import { defineConfig } from '@builtbyfriends/bwf/config';

export default defineConfig({
  cloudflare: {
    ratelimits: [
      { name: 'MY_RATE_LIMITER', namespace_id: '1001', simple: { limit: 10, period: 60 } },
    ],
  },
});
```

Run `bwf prepare`, or start the dev server, to use the binding without a type assertion:

```ts
import { defineHandler } from '@builtbyfriends/bwf';

export const GET = defineHandler(async (c) => {
  const { success } = await c.env.MY_RATE_LIMITER.limit({ key: 'example' });
  return { success };
});
```

Service bindings use `Fetcher`, Durable Objects use `DurableObjectNamespace`, and other bindings use their standard Cloudflare types. For RPC methods or other specialized types, augment `CloudBindings` in a file included by your tsconfig:

```ts
import type {} from '@builtbyfriends/bwf';

declare module '@builtbyfriends/bwf' {
  interface CloudBindings {
    AUTH: Fetcher & { check(): Promise<boolean> };
  }
}
```

Augmentation can refine a generated binding or add one you provide separately. Values declared in `env.ts` keep their schema types. These types apply to bwf's `c.env`; for `cloudflare:workers`, use your framework's binding types.

## Setup

Extend the generated tsconfig in your project:

```json
{
  "extends": "./.bwf/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "types": ["@builtbyfriends/bwf/env"]
  },
  "include": ["src", "routes", "middleware", "crons", "queues"]
}
```

If you already have a TypeScript config, run `bwf init --tsconfig` to add bwf types while preserving your settings.

Run `bwf prepare` in CI or after a fresh clone, or let `vite dev` / `vite build` generate the `.bwf/` files during normal app workflows.
