/**
 * Bump when a cached response accepted by an older writer can no longer be
 * proven safe to share. Readers reject entries from earlier policies instead
 * of replaying opaque bodies whose private headers were stripped at write time.
 */
export const SHARED_CACHE_POLICY_VERSION = 3 as const;
export const SHARED_CACHE_POLICY_HEADER = 'x-void-shared-cache-policy';

const CLIENT_REVALIDATE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/** Stamp an internal edge-cache representation with the policy that admitted it. */
export function markSharedCachePolicy(headers: Headers): void {
  headers.set(SHARED_CACHE_POLICY_HEADER, String(SHARED_CACHE_POLICY_VERSION));
}

/** Reject opaque edge entries admitted before the current privacy policy. */
export function hasCurrentSharedCachePolicy(response: Response): boolean {
  return response.headers.get(SHARED_CACHE_POLICY_HEADER) === String(SHARED_CACHE_POLICY_VERSION);
}

/** Return whether a response explicitly forbids storage in a shared cache. */
export function hasSharedCacheOptOut(response: Response): boolean {
  // Every header-dependent response must be served live, including Vary: *.
  if (
    response.headers
      .get('Vary')
      ?.split(',')
      .some((name) => name.trim() !== '')
  ) {
    return true;
  }
  if (response.headers.has('Set-Cookie')) {
    return true;
  }
  const cacheControl = response.headers.get('Cache-Control');
  if (!cacheControl) {
    return false;
  }
  return cacheControl.split(',').some((part) => {
    const directive = part.split('=', 1)[0]?.trim().toLowerCase();
    return directive === 'private' || directive === 'no-store' || directive === 'no-cache';
  });
}

/** A client copy of a shared-cache response: revalidate every time, no internal marker. */
export function clientRevalidateResponse(response: Response): Response {
  const res = new Response(response.body, response);
  res.headers.set('Cache-Control', CLIENT_REVALIDATE_CACHE_CONTROL);
  res.headers.delete(SHARED_CACHE_POLICY_HEADER);
  return res;
}

export function isEventStreamResponse(response: Response): boolean {
  return (
    response.headers.get('content-type')?.toLowerCase().split(';', 1)[0]?.trim() ===
    'text/event-stream'
  );
}

/**
 * Representations a single cached entry per path cannot hold: the entry stores
 * one body, so a request that negotiates one of these reads must be served live.
 */
const LIVE_ONLY_MEDIA_TYPES = ['text/event-stream', 'text/markdown'] as const;

/** Return whether credentials or negotiated media types require bypassing shared caches. */
export function bypassesSharedCache(request: Request): boolean {
  const accept = request.headers.get('Accept')?.toLowerCase();
  return (
    request.headers.has('Cookie') ||
    request.headers.has('Authorization') ||
    request.headers.has('Cf-Access-Jwt-Assertion') ||
    (accept
      ?.split(',')
      .some((part) =>
        LIVE_ONLY_MEDIA_TYPES.some((mediaType) => part.split(';', 1)[0]?.trim() === mediaType),
      ) ??
      false)
  );
}
