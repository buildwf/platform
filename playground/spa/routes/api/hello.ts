import { defineHandler } from '@builtbyfriends/bwf';

export const GET = defineHandler(() => {
  return { message: 'Hello from bwf!', timestamp: Date.now() };
});
