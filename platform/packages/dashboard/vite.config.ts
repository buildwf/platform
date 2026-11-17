import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { nosamPlugin } from 'nosam';

export default defineConfig({
  plugins: [
    react(),
    nosamPlugin({
      persistTo: resolve(__dirname, '../api/.wrangler/state'),
    }),
  ],
});
