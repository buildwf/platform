import { describe, expect, it } from 'vite-plus/test';
import { compareRouteSpecificity, routeSegmentKind } from '../../src/router/route-order.ts';

function route(pattern: string) {
  return {
    pattern,
    catchAll: pattern.split('/').some((segment) => routeSegmentKind(segment) === 'rest'),
  };
}

// Decision: Hono's route syntax: `:name{.+}` crosses `/`, `:name` is one segment, `*` matches the rest.
function matches(pattern: string, url: string): boolean {
  const source = pattern
    .split('/')
    .map((segment) =>
      segment === '*'
        ? '.*'
        : segment.endsWith('{.+}')
          ? '.+'
          : segment.startsWith(':')
            ? '[^/]+'
            : segment,
    )
    .join('/');
  return new RegExp(`^${source}$`).test(url);
}

describe('compareRouteSpecificity', () => {
  it.each([
    ['/users/:id', '/:lang/about', '/users/about'],
    ['/users/new/:tab', '/users/:id/edit', '/users/new/edit'],
    ['/:lang/about', '/:lang/:slug', '/en/about'],
    ['/about', '/:slug', '/about'],
    ['/:lang/about', '/:category/:item', '/fr/about'],
    ['/:z/about', '/:a/:b', '/fr/about'],
    ['/docs/:path{.+}', '/:slug{.+}', '/docs/intro'],
    ['/:lang/:path{.+}', '/:slug{.+}', '/fr/team/jobs'],
    ['/:lang/:slug', '/docs/:path{.+}', '/docs/intro'],
    ['/files/:name', '/files/*', '/files/a'],
  ])('ranks %s ahead of %s, which both match %s', (specific, general, url) => {
    expect(matches(specific, url)).toBe(true);
    expect(matches(general, url)).toBe(true);
    for (const routes of [
      [route(specific), route(general)],
      [route(general), route(specific)],
    ]) {
      expect(routes.sort(compareRouteSpecificity).map((r) => r.pattern)).toEqual([
        specific,
        general,
      ]);
    }
  });

  it('gives the same order for any input order', () => {
    const patterns = [
      '/',
      '/zzz',
      '/files/a*b',
      '/:lang',
      '/:lang/about',
      '/:lang/:slug',
      '/:category/:item',
      '/users/:id',
      '/users/:id/edit',
      '/users/new/:tab',
      '/docs/:path{.+}',
      '/:lang/:path{.+}',
      '/:slug{.+}',
      '/*',
    ];
    const expected = [
      // Decision: Fully static routes first, so Pages can look them up exactly.
      '/',
      '/files/a*b',
      '/zzz',
      '/users/new/:tab',
      '/users/:id',
      '/users/:id/edit',
      '/:lang',
      '/:lang/about',
      '/:category/:item',
      '/:lang/:slug',
      '/docs/:path{.+}',
      '/:lang/:path{.+}',
      '/*',
      '/:slug{.+}',
    ];
    for (let shift = 0; shift < patterns.length; shift++) {
      const rotated = [...patterns.slice(shift), ...patterns.slice(0, shift)];
      expect(rotated.reverse().map(route).sort(compareRouteSpecificity)).toEqual(
        expected.map(route),
      );
    }
  });
});
