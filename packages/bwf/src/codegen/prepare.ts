import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'pathslash';
import { analyzeApplication } from '../application-routing.ts';
import { loadBwfAuthConfig, projectAuthConfigImporter } from '../auth/config.ts';
import { generateBwfAuthDatabaseModule, generateBwfAuthDrizzleSchema } from '../auth/drizzle.ts';
import { getDatabaseCasing, readConfig } from '../config.ts';
import { discoverSchema } from '../drizzle/discover.ts';
import { loadLocalEnv } from '../shared/env.ts';
import { generateAuthTypes } from './auth-types.ts';
import { generateBindingTypes } from './binding-types.ts';
import { generateDbDts } from './db-types.ts';
import { findEnvFileForPaths, generateEnvTypes } from './env-types.ts';
import { generateProcedureTypes } from './procedure-types.ts';
import { ensureProjectTsconfig } from './project-tsconfig.ts';
import { generateQueueTypes } from './queue-types.ts';
import { generateRouteTypes } from './route-types.ts';
import { writeWireProcedureTypes } from './wire-procedure-types.ts';
import { writeFileIfChanged } from './write-if-changed.ts';

export type PrepareProjectResult = {
  written: Array<string>;
  removed: Array<string>;
};

function writeGeneratedFile(
  outDir: string,
  fileName: string,
  content: string,
  written: Array<string>,
): void {
  if (writeFileIfChanged(join(outDir, fileName), content)) {
    written.push(join('.bwf', fileName));
  }
}

function removeGeneratedFile(outDir: string, fileName: string, removed: Array<string>): void {
  const filePath = join(outDir, fileName);
  if (!existsSync(filePath)) {
    return;
  }
  rmSync(filePath, { force: true });
  removed.push(join('.bwf', fileName));
}

export async function prepareProject(root: string): Promise<PrepareProjectResult> {
  const config = readConfig(root);
  const analysis = await analyzeApplication(root, { config });
  const { paths, authConfigPath, authEnabled, dialect, scan } = analysis;
  const outDir = join(root, '.bwf');
  const written: Array<string> = [];
  const removed: Array<string> = [];

  const bindingTypes = generateBindingTypes(config);
  if (bindingTypes) {
    writeGeneratedFile(outDir, 'bindings.d.ts', bindingTypes, written);
  } else {
    removeGeneratedFile(outDir, 'bindings.d.ts', removed);
  }

  const envFile = findEnvFileForPaths(root, paths);
  if (envFile) {
    const { dts } = generateEnvTypes(envFile, outDir);
    writeGeneratedFile(outDir, 'env.d.ts', dts, written);
  } else {
    removeGeneratedFile(outDir, 'env.d.ts', removed);
  }

  if (authConfigPath) {
    const { dts } = generateAuthTypes(authConfigPath, outDir);
    writeGeneratedFile(outDir, 'auth.d.ts', dts, written);
  } else {
    removeGeneratedFile(outDir, 'auth.d.ts', removed);
  }

  const hasRouteTypes = scan.routes.length > 0 || (scan.websockets?.length ?? 0) > 0;
  if (hasRouteTypes) {
    const { dts } = generateRouteTypes(scan, paths.routesDir, outDir, {
      typedRoutes: config.routing?.typedRoutes,
    });
    writeGeneratedFile(outDir, 'routes.d.ts', dts, written);
  } else {
    removeGeneratedFile(outDir, 'routes.d.ts', removed);
  }

  // .bwf/tsconfig.json lists queues.d.ts whenever the queues directory exists,
  // so write it then, even with no queue files.
  if (existsSync(paths.queuesDir)) {
    const dts = generateQueueTypes(scan.queues, paths.queuesDir, outDir);
    writeGeneratedFile(outDir, 'queues.d.ts', dts, written);
  } else {
    removeGeneratedFile(outDir, 'queues.d.ts', removed);
  }

  // .bwf/tsconfig.json lists procedures.d.ts whenever the procedures directory exists.
  if (existsSync(paths.proceduresDir)) {
    const dts = generateProcedureTypes(scan.procedures ?? [], paths.proceduresDir, outDir);
    writeGeneratedFile(outDir, 'procedures.d.ts', dts, written);
  } else {
    removeGeneratedFile(outDir, 'procedures.d.ts', removed);
  }

  // A web workspace without procedures/ includes this types-only copy instead.
  if (config.procedureTypes) {
    const wire = await writeWireProcedureTypes({
      root,
      target: config.procedureTypes,
      proceduresDir: paths.proceduresDir,
      files: scan.procedures ?? [],
    });
    if (wire.changed) {
      written.push(config.procedureTypes);
    }
    for (const problem of wire.problems) {
      console.warn(`bwf: ${config.procedureTypes} has an unresolved type in ${problem}`);
    }
  }

  const schema = discoverSchema(root, paths);
  // Matches the Vite plugin, which serves its own `@builtbyfriends/bwf/db` for `database.casing`.
  const hasDbRuntime = schema != null || authEnabled || getDatabaseCasing(config) !== undefined;
  if (hasDbRuntime) {
    if (generateDbDts(outDir, schema, dialect)) {
      written.push(join('.bwf', 'db.d.ts'));
    }
  } else {
    removeGeneratedFile(outDir, 'db.d.ts', removed);
  }

  // Vite follows the project's tsconfig extends chain when loading auth.ts.
  if (ensureProjectTsconfig(root, hasRouteTypes, hasDbRuntime, schema != null, { paths })) {
    written.push(join('.bwf', 'tsconfig.json'));
  }

  if (authEnabled) {
    const authRuntime = {
      dialect,
      providers: config.auth?.providers ?? null,
      userConfig: await loadBwfAuthConfig(authConfigPath, projectAuthConfigImporter(root)),
    };
    const env = { ...loadLocalEnv(root), ...process.env } as Record<string, unknown>;
    const schemaPath = join(outDir, 'better-auth-schema.ts');
    const databasePath = join(outDir, 'better-auth-db.ts');
    const drizzleAdapterPath = fileURLToPath(import.meta.resolve('better-auth/adapters/drizzle'));

    if (writeFileIfChanged(schemaPath, generateBwfAuthDrizzleSchema(authRuntime, env))) {
      written.push(join('.bwf', 'better-auth-schema.ts'));
    }
    if (
      writeFileIfChanged(
        databasePath,
        generateBwfAuthDatabaseModule({
          dialect,
          schemaImportPath: schemaPath,
          drizzleAdapterPath,
        }),
      )
    ) {
      written.push(join('.bwf', 'better-auth-db.ts'));
    }
  } else {
    removeGeneratedFile(outDir, 'better-auth-schema.ts', removed);
    removeGeneratedFile(outDir, 'better-auth-db.ts', removed);
  }

  return { written, removed };
}
