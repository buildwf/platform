import { bwfPlugin } from '@buildwf/bwf';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [react(), bwfPlugin()],
  optimizeDeps: { include: ['valibot'] },
});
