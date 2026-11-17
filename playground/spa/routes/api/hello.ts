import { defineHandler } from 'void';

export const GET = defineHandler(() => {
  return { message: 'Hello from Nosam!', timestamp: Date.now() };
});
