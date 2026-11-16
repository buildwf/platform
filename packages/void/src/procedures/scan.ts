import { readFileSync } from 'node:fs';
import { join } from 'pathslash';
import { listConventionFiles } from '../shared/convention-files.ts';

export type ProcedureFile = {
  /** Relative file path from procedures/ */
  filePath: string;
  /**
   * Name prefix for the file's exports: `billing/invoices.ts` exporting `list` becomes
   * `billing.invoices.list`. An `index` file takes its folder's name.
   */
  prefix: string;
};

export function procedurePrefix(filePath: string): string {
  const segments = filePath.replace(/\.[^.]+$/, '').split('/');
  if (segments.at(-1) === 'index') {
    segments.pop();
  }
  return segments.join('.');
}

/** Every procedure module. Files and folders starting with `_` are shared helpers. */
export function scanProceduresSync(proceduresDir: string): Array<ProcedureFile> {
  return listConventionFiles(proceduresDir)
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => ({ filePath, prefix: procedurePrefix(filePath) }));
}

/** The app's name and version from package.json, for OpenAPI and the analytics dataset. */
export function readAppIdentity(root: string): { name: string; version: string } {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      name?: unknown;
      version?: unknown;
    };
    return {
      name: typeof pkg.name === 'string' ? pkg.name : 'app',
      version: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
    };
  } catch {
    return { name: 'app', version: '0.0.0' };
  }
}
