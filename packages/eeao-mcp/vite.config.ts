import { defineConfig } from 'vite-plus';

export default defineConfig({
  // tsconfig.build.json leaves out tests and the cross-package source paths, so the
  // declaration build reads dependencies from their dist and writes nothing next to source.
  pack: { entry: ['src/index.ts'], dts: { tsconfig: 'tsconfig.build.json' } },
});
