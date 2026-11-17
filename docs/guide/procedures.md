---
description: 'Define typed server functions in procedures/ and call them from your React app with rpc.'
outline: deep
---

# Procedures

Procedures are the typed server functions of your app. Define each one in `procedures/`, then call it from React with `rpc`. Every procedure is served at `POST /rpc/<name>`.

## Defining procedures

A procedure's name comes from its file and export. `procedures/contacts.ts` exporting `get` is `contacts.get`, `procedures/billing/invoices.ts` exporting `list` is `billing.invoices.list`, and a default export or an `index.ts` takes the file's or folder's name. Files and folders starting with `_` are ignored.

```ts
// procedures/contacts.ts
import { procedure, signedIn } from 'nosam/procedure';

export const get = procedure()
  .auth(signedIn)
  .input(schema)
  .output(schema)
  // ...
  .handler(({ input, env }) => findContact(env, input.id));
```

Each procedure must make every decision (authentication, input, output, authorization, errors, analytics, MCP, CLI and AI tool exposure), either by choosing one or by opting out with a reason. An unfinished procedure stops the Worker from starting, so `nosam deploy` fails instead of shipping it. `nosam gen procedure contacts.get` writes a starting point.

`signedIn` accepts the Better Auth session. Use `apiTokens` with `anyOf` to also accept bearer tokens from the CLI and agents.

## Calling procedures

```tsx
import { rpc } from 'nosam/rpc';
import { useCall } from 'nosam/rpc/react';

function Contact({ id }: { id: string }) {
  const { data, error, loading, refetch } = useCall(rpc.contacts.get, { id });
  // ...
}

await rpc.contacts.update({ id, name });
```

Inputs, outputs and the error codes of a failed call are typed from the procedure. A failed call throws an `RpcError` with a `code` such as `UNAUTHENTICATED` or `INVALID_INPUT`. `useCall` tracks loading state, errors and refetch, and nothing else: wrap `rpc` in a cache if you need one.

Types come from `.nosam/procedures.d.ts`, which `nosam dev`, `nosam build` and `nosam prepare` keep current. It imports only types, so no server code reaches the browser.

To call procedures from another origin or a script, create a client with `createRpc({ baseUrl, token })` from `nosam/rpc`.
