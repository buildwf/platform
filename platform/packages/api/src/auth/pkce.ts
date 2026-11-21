// Decision: PKCE (RFC 7636) checks shared by the CLI login flow (`routes/auth.ts`) and the
// GitHub-identity link flow (`routes/github.ts`). oauth4webapi's calculatePKCECodeChallenge
// makes the S256 challenge.

/** The only `code_challenge_method` we accept: SHA-256 → base64url. */
export const CLI_CODE_CHALLENGE_METHOD = 'S256';

/**
 * RFC 7636 §4.1 `code_verifier`: 43–128 chars from the unreserved set
 * `[A-Za-z0-9._~-]`. Narrow type guard so callers can branch on a `string`.
 */
export function isValidCodeVerifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 43 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._~-]+$/.test(value)
  );
}
