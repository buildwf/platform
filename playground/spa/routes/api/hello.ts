import { defineHandler } from '@buildwf/bwf';

export const GET = defineHandler(() => {
  return { message: 'Hello from bwf!', timestamp: Date.now() };
});
