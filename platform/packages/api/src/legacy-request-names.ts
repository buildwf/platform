/**
 * The bwf CLI 1.9.1 on npm still sends the names from before the rename:
 * `X-Nosam-*` headers and `GET /.well-known/nosam-platform`. This maps them to
 * the current names before routing, so that CLI keeps working. Remove it once
 * no supported CLI sends the old names.
 */
const LEGACY_HEADER = /^x-nosam-(?:platform-)?/;
const LEGACY_DISCOVERY_PATH = '/.well-known/nosam-platform';

export function withCurrentRequestNames(request: Request): Request {
  const url = new URL(request.url);
  const legacyPath = url.pathname === LEGACY_DISCOVERY_PATH;
  let headers: Headers | null = null;
  for (const [name, value] of request.headers) {
    if (!LEGACY_HEADER.test(name)) {
      continue;
    }
    const current = name.replace(LEGACY_HEADER, 'x-platform-');
    headers ??= new Headers(request.headers);
    if (!headers.has(current)) {
      headers.set(current, value);
    }
    headers.delete(name);
  }
  if (!legacyPath && headers === null) {
    return request;
  }
  if (legacyPath) {
    url.pathname = '/.well-known/platform';
  }
  return new Request(url, new Request(request, { headers: headers ?? request.headers }));
}
