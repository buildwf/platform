# Server auth errors

Compare auth checks and redirects from middleware and API routes behind a React SPA.

From the repository root:

```sh
vp run --filter ./playground/server-auth-errors dev
```

`middleware/auth.ts` guards `/middleware/<mode>`: `require-auth` answers a plain-text `401`, the
other modes redirect to `/login` (a returned redirect, a thrown `302` from
`src/require-page-user.ts`, and `requireAuth` with `throwRedirect`). `POST /api/demo-login` signs
in as the demo user, creating the account on first use; `GET /api/profile` requires that session.
The app uses Nosam's auth and local D1; dev creates the auth tables automatically.

## Tests

```sh
vp test run packages/nosam/test/integration/server-auth-errors.test.ts
```
