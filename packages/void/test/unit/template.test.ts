import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import { SCAFFOLD_FRAMEWORKS } from '../../src/cli/template.ts';

describe('React starter', () => {
  // The starter and the playgrounds use the same @vitejs/plugin-react, so a catalog bump must
  // update the starter too.
  it("pins @vitejs/plugin-react to the workspace catalog's range", () => {
    const workspace = readFileSync(
      new URL('../../../../pnpm-workspace.yaml', import.meta.url),
      'utf-8',
    );
    const range = /^ {2}'@vitejs\/plugin-react': (\S+)$/m.exec(workspace)?.[1];

    expect(range).toBeDefined();
    expect(SCAFFOLD_FRAMEWORKS.react.devDependencies?.['@vitejs/plugin-react']).toBe(range);
  });
});
