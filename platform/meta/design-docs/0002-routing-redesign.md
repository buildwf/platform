---
title: Typed File-Based API Routes
status: implemented
---

# Typed file-based API routes

Nosam compiles route files into a Hono runtime and generates route types in .bwf/routes.d.ts. Handlers and Standard Schema validators define method inputs and outputs; nosam/client consumes the generated map for typed fetch calls. Generated type references point at the handler modules, avoiding a single inferred Hono app type that grows with every route.

Body, query, and route params are separate validator slots. Client output types reflect JSON serialization. See [route code generation](../../../packages/bwf/src/codegen/route-types.ts), [routing plugin](../../../packages/bwf/src/plugin-routing.ts), and the [server routing guide](../../../docs/guide/server-routing.md).
