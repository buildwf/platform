---
description: 'Nosam builds React single-page apps with an optional backend on Cloudflare Workers, powered by Vite. It connects routing, data, and deployment in one project.'
outline: deep
---

# What is Nosam?

Nosam builds React single-page apps with an optional backend on Cloudflare Workers, powered by Vite. Build your UI as a React SPA and write server code in the same project. Nosam connects routing, data access, and deployment while keeping types shared across your app.

Start with the [Quickstart](./quickstart.md) to create and deploy an app.

## A React app with server routes

The UI is a React single-page app: `index.html` loads `src/main.tsx`, Vite bundles it, and the browser renders every page. Use any client-side router you like.

The backend is optional. Files in `routes/` define [server routes](./server-routing.md): a handler in `routes/api/users.ts` serves `/api/users`. The app calls them with [typed fetch](./typed-fetch.md), so request and response types stay in sync.

## Resources from your code

Import `db` from `nosam/db` to query your database. Nosam provides a local database during development and provisions one when you deploy. Imports also enable resources such as [KV](./kv.md), [object storage](./storage.md), and [queues](./queues.md). Use configuration when you need to connect existing resources.

Your Drizzle schema defines database types. Handlers infer response types, and typed fetch checks their callers. Changing a field shows you which parts of the app need to change.

## From local development to production

Vite runs your app locally with Cloudflare's runtime. `nosam deploy` builds it, provisions resources, applies database migrations, and publishes it. [Environment variables](./env-vars.md) use a schema, local values, and production secrets.

Deploy to [your own Cloudflare account](./deployment.md#deploy-to-cloudflare), or connect to a [Nosam platform](./self-hosted-platform.md) run by your team. Both use the same application APIs. A platform adds shared access, deployment history, and administration.

Nosam also deploys [static SPAs and static sites](./app-types.md) without a backend.

## Next steps

- [Quickstart](./quickstart.md): create your first app
- [Server Routing](./server-routing.md): API routes, validation, and middleware
- [Database](./database.md): schemas, queries, and migrations
- [Deployment](./deployment.md): Cloudflare, team platforms, and CI
