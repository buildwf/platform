import { defineHandler } from 'nosam';

export const GET = defineHandler(() => {
  return { message: 'Hello from Nosam!', timestamp: Date.now() };
});
