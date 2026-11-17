import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { nosamPlugin } from 'nosam';

export default defineConfig({
  plugins: [react(), nosamPlugin()],
  optimizeDeps: { include: ['valibot'] },
});
