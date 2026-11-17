import type { NosamAuthMigrationSchema } from '../auth/drizzle.ts';
import { applySqliteAuthMigrations } from './auth-migrations.ts';
import {
  createNosamAuthRuntime,
  type NosamAuthEnv,
  type NosamAuthRuntimeApi,
} from './better-auth-shared.ts';

async function applyMigrations(
  env: NosamAuthEnv,
  migrationSchema: NosamAuthMigrationSchema,
): Promise<void> {
  const database = env.DB;
  if (!database) {
    throw new Error('auth: Better Auth requires the "DB" D1 binding for sqlite apps.');
  }

  await applySqliteAuthMigrations(
    {
      async all<T extends Record<string, unknown>>(sql: string) {
        const result = await database.prepare(sql).all();
        return (result.results ?? []) as Array<T>;
      },
      async run(sql: string) {
        await database.prepare(sql).run();
      },
    },
    migrationSchema,
  );
}

const runtime = createNosamAuthRuntime('sqlite', applyMigrations);

export const resolveNosamAuthOptions: NosamAuthRuntimeApi['resolveNosamAuthOptions'] =
  runtime.resolveNosamAuthOptions;
export const resolveNosamAuthState: NosamAuthRuntimeApi['resolveNosamAuthState'] =
  runtime.resolveNosamAuthState;
export const runNosamAuthMiddleware: NosamAuthRuntimeApi['runNosamAuthMiddleware'] =
  runtime.runNosamAuthMiddleware;
export const handleNosamAuthRequest: NosamAuthRuntimeApi['handleNosamAuthRequest'] =
  runtime.handleNosamAuthRequest;
export const runNosamAuthMigrations: NosamAuthRuntimeApi['runNosamAuthMigrations'] =
  runtime.runNosamAuthMigrations;
