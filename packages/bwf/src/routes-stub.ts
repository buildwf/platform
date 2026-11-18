export { routeUrl } from './runtime/route-url.ts';
export type {
  Href,
  RoutePath,
  RouteOptions,
  RouteQuery,
  RouteQueryValue,
  RouteDestination,
  RouteUrl,
  RouteUrlInput,
} from './runtime/route-url.ts';

/** Known URL patterns and their parameter names, augmented by .bwf/routes.d.ts. */
export interface RoutePathMap {}

/** Percent-encoded spellings of patterns with encoded fixed segments, augmented by .bwf/routes.d.ts. */
export interface EncodedRoutePathMap {}

/** Route type options, augmented by .bwf/routes.d.ts when `routing.typedRoutes` is on. */
export interface RouteTypesConfig {}

/** Stub interface augmented by the generated .bwf/routes.d.ts */
export interface RouteMap {}

/** Stub interface augmented by the generated .bwf/routes.d.ts */
export interface WebSocketRouteMap {}

/** Union of known route patterns (keys of the generated RouteMap). */
export type RouteName = keyof RouteMap;

/**
 * Destination type for rewrites / fallbacks / c.rewrite().
 *
 * The `string & {}` branch keeps IDE autocomplete of known routes while
 * still accepting arbitrary strings (needed for dynamic paths like
 * `/users/${id}`). When no routes are generated yet, `RouteName` is
 * `never` and this degenerates to `string & {}`, which is assignable
 * from any string.
 */
export type RewriteDestination = RouteName | (string & {});
