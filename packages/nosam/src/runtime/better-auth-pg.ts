import type { NosamAuthMigrationSchema } from '../auth/drizzle.ts';
import { applyPgAuthMigrations, pgMigrationRunner } from './auth-migrations.ts';
import {
  createNosamAuthRuntime,
  resolveConnectionString,
  type NosamAuthEnv,
  type NosamAuthRuntimeApi,
} from './better-auth-shared.ts';
import { disablePgPassFallback } from './pg.ts';

async function applyMigrations(
  env: NosamAuthEnv,
  migrationSchema: NosamAuthMigrationSchema,
): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: resolveConnectionString(env, 'PostgreSQL') });
  disablePgPassFallback(client);
  await client.connect();
  try {
    await applyPgAuthMigrations(pgMigrationRunner(client), migrationSchema);
  } finally {
    await client.end();
  }
}

const runtime = createNosamAuthRuntime('postgresql', applyMigrations);

export const resolveNosamAuthState: NosamAuthRuntimeApi['resolveNosamAuthState'] =
  runtime.resolveNosamAuthState;
export const runNosamAuthMiddleware: NosamAuthRuntimeApi['runNosamAuthMiddleware'] =
  runtime.runNosamAuthMiddleware;
export const handleNosamAuthRequest: NosamAuthRuntimeApi['handleNosamAuthRequest'] =
  runtime.handleNosamAuthRequest;
export const runNosamAuthMigrations: NosamAuthRuntimeApi['runNosamAuthMigrations'] =
  runtime.runNosamAuthMigrations;
