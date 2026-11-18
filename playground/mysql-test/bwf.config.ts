import { defineConfig } from '@buildwf/bwf/config';

export default defineConfig({
  database: 'mysql',
  worker: {
    compatibility_date: '2026-02-24',
  },
});
