---
title: PostgreSQL via Hyperdrive
status: implemented
---

# PostgreSQL via Hyperdrive

Nosam apps can select PostgreSQL in database configuration. The generated database runtime uses Drizzle with a Hyperdrive connection, while SQLite apps use D1. Database inference and deployment choose the binding for the selected dialect. Development uses a local database URL; deployed apps use the provisioned Hyperdrive binding.

The same schema and migration workflow supports PostgreSQL-specific tables and SQL. Platform and native Cloudflare deployment paths resolve the database resource before uploading the Worker. See the [PostgreSQL runtime](../../../packages/bwf/src/runtime/db-pg.ts), [deployment handling](../../../packages/bwf/src/cli/deploy.ts), and the [PostgreSQL guide](../../../docs/guide/database/postgresql.md).
