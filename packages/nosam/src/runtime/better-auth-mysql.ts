import type { NosamAuthMigrationSchema } from '../auth/drizzle.ts';
import { applyMySqlAuthMigrations, mysqlMigrationRunner } from './auth-migrations.ts';
import {
  createNosamAuthRuntime,
  resolveConnectionString,
  type NosamAuthEnv,
  type NosamAuthRuntimeApi,
} from './better-auth-shared.ts';

async function applyMigrations(
  env: NosamAuthEnv,
  migrationSchema: NosamAuthMigrationSchema,
): Promise<void> {
  const { createConnection } = await import('mysql2/promise');
  const connection = await createConnection({
    uri: resolveConnectionString(env, 'MySQL'),
    disableEval: true,
  });
  try {
    await applyMySqlAuthMigrations(mysqlMigrationRunner(connection), migrationSchema);
  } finally {
    await connection.end();
  }
}

const runtime = createNosamAuthRuntime('mysql', applyMigrations);

export const resolveNosamAuthState: NosamAuthRuntimeApi['resolveNosamAuthState'] =
  runtime.resolveNosamAuthState;
export const runNosamAuthMiddleware: NosamAuthRuntimeApi['runNosamAuthMiddleware'] =
  runtime.runNosamAuthMiddleware;
export const handleNosamAuthRequest: NosamAuthRuntimeApi['handleNosamAuthRequest'] =
  runtime.handleNosamAuthRequest;
export const runNosamAuthMigrations: NosamAuthRuntimeApi['runNosamAuthMigrations'] =
  runtime.runNosamAuthMigrations;
