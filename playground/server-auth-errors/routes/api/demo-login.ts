import { defineHandler } from '@builtbyfriends/bwf';
import { getAuth } from '@builtbyfriends/bwf/auth';
import { demoUser } from '../../src/demo-user.ts';

// Decision: This demo signs in the same user whatever fields are submitted.
export const POST = defineHandler(async (c) => {
  const auth = getAuth(c);
  const options = { body: demoUser, headers: c.req.raw.headers, asResponse: true } as const;
  const response = await auth.api.signInEmail(options);
  if (response.status !== 401) {
    return response;
  }

  const created = await auth.api.signUpEmail(options);
  if (created.status === 422) {
    // Decision: Another first login may have created the account at the same time.
    return auth.api.signInEmail(options);
  }
  return created;
});
