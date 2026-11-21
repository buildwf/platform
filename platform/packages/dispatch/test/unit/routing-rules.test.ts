import { describe, it, expect, vi } from 'vite-plus/test';
import { applyRoutingRules, mergeQueryIntoLocation } from '../../src/routing-rules.ts';

describe('applyRoutingRules', () => {
  it('returns null when no rules', () => {
    expect(applyRoutingRules('/foo')).toBeNull();
    expect(applyRoutingRules('/foo', [])).toBeNull();
  });

  it('returns null when no match', () => {
    const rules = [{ source: '/old', destination: '/new', status: 301 }];
    expect(applyRoutingRules('/other', rules)).toBeNull();
  });

  it('returns redirect for 3xx rules', () => {
    const rules = [{ source: '/old', destination: '/new', status: 301 }];
    const result = applyRoutingRules('/old', rules);
    expect(result).toEqual({ type: 'redirect', destination: '/new', status: 301 });
  });

  it('returns 303 redirect for status 303 rules', () => {
    const rules = [{ source: '/submit', destination: '/thanks', status: 303 }];
    const result = applyRoutingRules('/submit', rules);
    expect(result).toEqual({ type: 'redirect', destination: '/thanks', status: 303 });
  });

  it('returns rewrite for status 200 rules', () => {
    const rules = [{ source: '/docs', destination: '/en/docs', status: 200 }];
    const result = applyRoutingRules('/docs', rules);
    expect(result).toEqual({ type: 'rewrite', destination: '/en/docs' });
  });

  it('matches legacy * wildcard with :splat substitution', () => {
    const rules = [{ source: '/blog/*', destination: '/posts/:splat', status: 301 }];
    const result = applyRoutingRules('/blog/hello-world', rules);
    expect(result).toEqual({ type: 'redirect', destination: '/posts/hello-world', status: 301 });
  });

  it('supports named :param captures (single segment)', () => {
    const rules = [{ source: '/blog/:slug', destination: '/articles/:slug', status: 301 }];
    const result = applyRoutingRules('/blog/hello', rules);
    expect(result).toEqual({ type: 'redirect', destination: '/articles/hello', status: 301 });
  });

  it('named :param does not match across slashes', () => {
    const rules = [{ source: '/blog/:slug', destination: '/articles/:slug', status: 301 }];
    expect(applyRoutingRules('/blog/a/b', rules)).toBeNull();
  });

  it('supports multiple named captures', () => {
    const rules = [
      {
        source: '/blog/:author/:slug',
        destination: '/articles/:author/:slug',
        status: 301,
      },
    ];
    const result = applyRoutingRules('/blog/jane/post-1', rules);
    expect(result).toEqual({
      type: 'redirect',
      destination: '/articles/jane/post-1',
      status: 301,
    });
  });

  it('supports catch-all :name* captures', () => {
    const rules = [{ source: '/files/:path*', destination: '/storage/:path', status: 200 }];
    const result = applyRoutingRules('/files/a/b/c.txt', rules);
    expect(result).toEqual({ type: 'rewrite', destination: '/storage/a/b/c.txt' });
  });

  // Decision: First-match-wins follows Netlify `_redirects` and Vercel `vercel.json`. Header rules use
  // last-match-wins for `_headers` compatibility; the difference is on purpose.
  it('first match wins when redirect comes before rewrite', () => {
    const rules = [
      { source: '/page', destination: '/other', status: 302 },
      { source: '/page', destination: '/en/page', status: 200 },
    ];
    const result = applyRoutingRules('/page', rules);
    expect(result).toEqual({ type: 'redirect', destination: '/other', status: 302 });
  });

  it('first match wins when rewrite comes before redirect', () => {
    const rules = [
      { source: '/page', destination: '/en/page', status: 200 },
      { source: '/page', destination: '/other', status: 301 },
    ];
    const result = applyRoutingRules('/page', rules);
    expect(result).toEqual({ type: 'rewrite', destination: '/en/page' });
  });

  it('first match wins on overlapping wildcards', () => {
    const rules = [
      { source: '/blog/preview', destination: '/preview', status: 302 },
      { source: '/blog/*', destination: '/posts/:splat', status: 301 },
    ];
    expect(applyRoutingRules('/blog/preview', rules)).toEqual({
      type: 'redirect',
      destination: '/preview',
      status: 302,
    });
    expect(applyRoutingRules('/blog/hello', rules)).toEqual({
      type: 'redirect',
      destination: '/posts/hello',
      status: 301,
    });
  });

  it('leaves unknown :placeholders untouched in destination', () => {
    const rules = [{ source: '/old', destination: '/new/:ref', status: 301 }];
    const result = applyRoutingRules('/old', rules);
    expect(result).toEqual({ type: 'redirect', destination: '/new/:ref', status: 301 });
  });

  it('matches legacy rules with multiple anonymous wildcards', () => {
    const rules = [{ source: '/*/static/*', destination: '/x/:splat', status: 301 }];
    expect(applyRoutingRules('/app/static/logo.png', rules)).toEqual({
      type: 'redirect',
      destination: '/x/app',
      status: 301,
    });
  });

  it('returns null (not throws) when every rule has an invalid source', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const rules = [{ source: '/:id/static/:id', destination: '/x', status: 301 }];
      expect(applyRoutingRules('/foo', rules)).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });

  it('matches an oversized source instead of failing the request', () => {
    const big = '/' + 'a'.repeat(40_000);
    const rules = [
      { source: big, destination: '/x', status: 301 },
      { source: '/old', destination: '/new', status: 301 },
    ];
    expect(applyRoutingRules('/old', rules)).toEqual({
      type: 'redirect',
      destination: '/new',
      status: 301,
    });
    expect(applyRoutingRules(big, rules)).toEqual({
      type: 'redirect',
      destination: '/x',
      status: 301,
    });
  });

  // Decision: Percent-encoded and non-ASCII paths arrive as is from `new URL().pathname` (Cloudflare
  // doesn't normalize them), so pattern text matches the raw pathname unit for unit.
  it('matches non-ASCII path segments literally', () => {
    const rules = [{ source: '/café/*', destination: '/fr/café/:splat', status: 301 }];
    expect(applyRoutingRules('/café/menu', rules)).toEqual({
      type: 'redirect',
      destination: '/fr/café/menu',
      status: 301,
    });
  });

  it('matches percent-encoded path segments literally', () => {
    const rules = [{ source: '/caf%C3%A9/*', destination: '/fr/caf%C3%A9/:splat', status: 200 }];
    expect(applyRoutingRules('/caf%C3%A9/menu', rules)).toEqual({
      type: 'rewrite',
      destination: '/fr/caf%C3%A9/menu',
    });
  });

  describe('host-scoped rules', () => {
    // Decision: The API lowercases `host` at deploy ingest and `url.hostname` is lowercase per WHATWG, so the
    // runtime compare is exact equality.
    it('fires when rule.host equals requestHost', () => {
      const rules = [
        { source: '/*', destination: 'https://foo.com/:splat', status: 301, host: 'www.foo.com' },
      ];
      expect(applyRoutingRules('/about', rules, 'www.foo.com')).toEqual({
        type: 'redirect',
        destination: 'https://foo.com/about',
        status: 301,
      });
    });

    it('skips when rule.host differs from requestHost', () => {
      const rules = [
        { source: '/*', destination: 'https://foo.com/:splat', status: 301, host: 'www.foo.com' },
      ];
      expect(applyRoutingRules('/about', rules, 'foo.com')).toBeNull();
    });

    it('skips when rule.host set but requestHost is undefined', () => {
      // Decision: The host parameter is optional. A host-scoped rule mustn't fire when no host is given, or it
      // would leak across domains.
      const rules = [
        { source: '/*', destination: 'https://foo.com/:splat', status: 301, host: 'www.foo.com' },
      ];
      expect(applyRoutingRules('/about', rules)).toBeNull();
    });

    it('falls through to a path-only rule when host-scoped rule misses', () => {
      const rules = [
        { source: '/*', destination: 'https://foo.com/:splat', status: 301, host: 'www.foo.com' },
        { source: '/old', destination: '/new', status: 301 },
      ];
      expect(applyRoutingRules('/old', rules, 'foo.com')).toEqual({
        type: 'redirect',
        destination: '/new',
        status: 301,
      });
    });

    it('matches the first host-scoped rule whose host equals requestHost', () => {
      const rules = [
        { source: '/*', destination: 'https://foo.com/:splat', status: 301, host: 'www.foo.com' },
        { source: '/*', destination: 'https://other.com/:splat', status: 301, host: 'other.com' },
      ];
      expect(applyRoutingRules('/about', rules, 'other.com')).toEqual({
        type: 'redirect',
        destination: 'https://other.com/about',
        status: 301,
      });
    });

    it('host comparison is case-sensitive (relies on API lowercasing)', () => {
      const rules = [{ source: '/*', destination: '/x', status: 301, host: 'WWW.FOO.COM' }];
      expect(applyRoutingRules('/about', rules, 'www.foo.com')).toBeNull();
    });

    it('path-only rules apply to every host', () => {
      const rules = [{ source: '/old', destination: '/new', status: 301 }];
      expect(applyRoutingRules('/old', rules, 'a.com')).toEqual({
        type: 'redirect',
        destination: '/new',
        status: 301,
      });
      expect(applyRoutingRules('/old', rules, 'b.com')).toEqual({
        type: 'redirect',
        destination: '/new',
        status: 301,
      });
    });

    it('host-scoped rule above a matching path-only rule wins on its host', () => {
      const rules = [
        {
          source: '/old',
          destination: 'https://foo.com/new',
          status: 301,
          host: 'www.foo.com',
        },
        { source: '/old', destination: '/new', status: 301 },
      ];
      expect(applyRoutingRules('/old', rules, 'www.foo.com')).toEqual({
        type: 'redirect',
        destination: 'https://foo.com/new',
        status: 301,
      });
      expect(applyRoutingRules('/old', rules, 'foo.com')).toEqual({
        type: 'redirect',
        destination: '/new',
        status: 301,
      });
    });
  });
});

describe('mergeQueryIntoLocation', () => {
  it('returns destination unchanged when no query to merge', () => {
    expect(mergeQueryIntoLocation('/new', '')).toBe('/new');
    expect(mergeQueryIntoLocation('/new', '?')).toBe('/new');
  });

  it('appends request query when destination has none', () => {
    expect(mergeQueryIntoLocation('/new', '?utm=x&id=5')).toBe('/new?utm=x&id=5');
  });

  it('destination query wins on per-key conflict', () => {
    expect(mergeQueryIntoLocation('/new?ref=internal', '?ref=external&utm=x')).toBe(
      '/new?ref=internal&utm=x',
    );
  });

  it('drops request query when destination has an explicit empty query', () => {
    expect(mergeQueryIntoLocation('/new?', '?utm=x&id=5')).toBe('/new');
    expect(mergeQueryIntoLocation('/new?#faq', '?utm=x&id=5')).toBe('/new#faq');
  });

  it('preserves destination-only params and adds request-only params', () => {
    expect(mergeQueryIntoLocation('/new?a=1', '?b=2')).toBe('/new?a=1&b=2');
  });

  it('preserves destination fragment when appending request query', () => {
    expect(mergeQueryIntoLocation('/new#faq', '?utm=x')).toBe('/new?utm=x#faq');
  });

  it('preserves destination fragment when merging query params', () => {
    expect(mergeQueryIntoLocation('/new?a=1#faq', '?b=2')).toBe('/new?a=1&b=2#faq');
  });
});
