import { defineHandler } from '@builtbyfriends/bwf';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { calculatePKCECodeChallenge, generateRandomCodeVerifier } from 'oauth4webapi';
import { fetchApi, getPublicApiUrl } from '../lib/api.ts';
import { isLocalDashboardHost } from '../lib/origin.ts';
import { discoveryDisplayName } from '../lib/platform-title.ts';

export type Props = Readonly<{
  methods: ReadonlyArray<{ id: string; label: string; url: string }>;
  platformName: string;
  unavailable?: boolean;
  devLoginUrl?: string;
}>;

export const loader = defineHandler<Props>(async (context) => {
  const platformUrl = getPublicApiUrl(context);

  // Decision: The origin comes from the Host header: Workers Assets internal dispatch can make
  // context.req.url localhost in production.
  const host = context.req.header('host')!;
  const isLocal = isLocalDashboardHost(host);
  const protocol = isLocal ? 'http' : 'https';
  const callbackUrl = `${protocol}://${host}/auth/callback`;

  // Decision: Binds the OAuth callback to this browser session to prevent login CSRF. The nonce goes in a
  // cookie and in the redirect URL, and the callback checks they match, so an attacker's crafted
  // callback URL won't match the victim's cookie.
  const nonce = getCookie(context, 'platform_auth_nonce') ?? crypto.randomUUID();
  setCookie(context, 'platform_auth_nonce', nonce, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'Lax',
    path: '/',
    maxAge: 300,
  });
  deleteCookie(context, 'platform_auth_nonce', { path: '/auth' });

  const callback = new URL(callbackUrl);
  callback.searchParams.set('login_nonce', nonce);
  let pkceChallenge: string | undefined;
  if (isLocal) {
    const verifier = generateRandomCodeVerifier();
    const state = crypto.randomUUID();
    pkceChallenge = await calculatePKCECodeChallenge(verifier);
    callback.searchParams.set('state', state);
    setCookie(context, 'platform_auth_pkce', `${state}:${verifier}`, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/auth/callback',
      maxAge: 300,
    });
  }
  const callbackWithNonce = callback.href;
  let methods: Props['methods'] = [];
  let platformName = 'Platform';
  let unavailable = false;
  try {
    const response = await fetchApi(context, '/.well-known/platform');
    if (!response.ok) {
      throw new Error('Discovery unavailable');
    }
    const document = (await response.json()) as {
      schemaVersion?: number;
      displayName?: unknown;
      authentication?: { methods: Array<{ id: string; label: string }> };
      authenticationProviders?: Array<string>;
    };
    if (![1, 2, 3].includes(document.schemaVersion ?? 0)) {
      throw new Error('Unsupported platform');
    }
    platformName = discoveryDisplayName(document);
    const descriptors =
      document.schemaVersion === 3
        ? document.authentication?.methods
        : document.authenticationProviders?.map((id) => ({
            id,
            label: id === 'github' ? 'GitHub' : id === 'google' ? 'Google' : id,
          }));
    if (!Array.isArray(descriptors) || descriptors.length > 32) {
      throw new Error('Invalid login methods');
    }
    methods = descriptors.map((method) => {
      if (typeof method.id !== 'string' || typeof method.label !== 'string') {
        throw new Error('Invalid login method');
      }
      return {
        id: method.id,
        label: method.label,
        url: (() => {
          const url = new URL('/auth/login', platformUrl);
          url.searchParams.set('provider', method.id);
          url.searchParams.set('redirect', callbackWithNonce);
          if (pkceChallenge) {
            url.searchParams.set('code_challenge', pkceChallenge);
            url.searchParams.set('code_challenge_method', 'S256');
          }
          return url.href;
        })(),
      };
    });
  } catch {
    unavailable = true;
  }
  context.header('Cache-Control', 'no-store');

  let devLoginUrl: string | undefined;
  try {
    const apiHostname = new URL(platformUrl).hostname;
    if (apiHostname === 'localhost' || apiHostname === '127.0.0.1') {
      devLoginUrl = `${platformUrl}/auth/dev-login?redirect=${encodeURIComponent(callbackWithNonce)}`;
    }
  } catch {}

  return { methods, platformName, unavailable, devLoginUrl };
});
