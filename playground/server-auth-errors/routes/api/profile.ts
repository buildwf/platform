import { defineHandler } from 'nosam';
import { requireAuth } from 'nosam/auth';

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { name: user.name, email: user.email };
});
