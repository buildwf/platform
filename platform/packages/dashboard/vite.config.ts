import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [
    react(),
    voidPlugin({
      persistTo: resolve(__dirname, '../api/.wrangler/state'),
    }),
  ],
});
