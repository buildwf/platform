import { defineHandler } from '@buildwf/bwf';
import { requireAuth } from '@buildwf/bwf/auth';

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { name: user.name, email: user.email };
});
