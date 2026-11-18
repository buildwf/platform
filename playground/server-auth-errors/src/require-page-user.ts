import type { CloudContext } from '@buildwf/bwf';
import { getUser } from '@buildwf/bwf/auth';
import { HTTPException } from 'hono/http-exception';

export function requirePageUser(c: CloudContext, status: 302 | 303 = 302) {
  const user = getUser();
  if (!user) {
    throw new HTTPException(status, { res: c.redirect('/login', status) });
  }
  return user;
}
