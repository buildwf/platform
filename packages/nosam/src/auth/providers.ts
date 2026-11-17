export const NOSAM_SOCIAL_AUTH_PROVIDERS = [
  'apple',
  'atlassian',
  'cognito',
  'discord',
  'dropbox',
  'facebook',
  'figma',
  'github',
  'gitlab',
  'google',
  'huggingface',
  'kakao',
  'kick',
  'line',
  'linear',
  'linkedin',
  'microsoft',
  'naver',
  'notion',
  'paybin',
  'paypal',
  'polar',
  'railway',
  'reddit',
  'roblox',
  'salesforce',
  'slack',
  'spotify',
  'tiktok',
  'twitch',
  'twitter',
  'vercel',
  'vk',
  'zoom',
] as const;

export const NOSAM_EMAIL_AUTH_PROVIDER = 'email';

export const NOSAM_AUTH_PROVIDERS: readonly [
  typeof NOSAM_EMAIL_AUTH_PROVIDER,
  ...typeof NOSAM_SOCIAL_AUTH_PROVIDERS,
] = [NOSAM_EMAIL_AUTH_PROVIDER, ...NOSAM_SOCIAL_AUTH_PROVIDERS] as const;

export type NosamSocialAuthProvider = (typeof NOSAM_SOCIAL_AUTH_PROVIDERS)[number];
export type NosamAuthProvider = (typeof NOSAM_AUTH_PROVIDERS)[number];

const NOSAM_SOCIAL_AUTH_PROVIDER_SET = new Set<string>(NOSAM_SOCIAL_AUTH_PROVIDERS);
const NOSAM_AUTH_PROVIDER_SET = new Set<string>(NOSAM_AUTH_PROVIDERS);

export function isNosamSocialAuthProvider(value: string): value is NosamSocialAuthProvider {
  return NOSAM_SOCIAL_AUTH_PROVIDER_SET.has(value);
}

export function isNosamAuthProvider(value: string): value is NosamAuthProvider {
  return NOSAM_AUTH_PROVIDER_SET.has(value);
}

/** Provider options other than the client credentials, with the env var that holds each one. */
const NOSAM_AUTH_PROVIDER_SETTING_ENV_NAMES: Partial<
  Record<NosamSocialAuthProvider, Record<string, string>>
> = {
  cognito: {
    domain: 'AUTH_COGNITO_DOMAIN',
    region: 'AUTH_COGNITO_REGION',
    userPoolId: 'AUTH_COGNITO_USER_POOL_ID',
  },
};

export function getNosamAuthProviderSettingEnvNames(
  provider: NosamSocialAuthProvider,
): Record<string, string> {
  return NOSAM_AUTH_PROVIDER_SETTING_ENV_NAMES[provider] ?? {};
}

export function getNosamAuthProviderEnvNames(provider: NosamSocialAuthProvider): {
  clientId: string;
  clientSecret: string;
} {
  const normalized = provider.toUpperCase().replaceAll('-', '_');
  return {
    clientId: `AUTH_${normalized}_CLIENT_ID`,
    clientSecret: `AUTH_${normalized}_CLIENT_SECRET`,
  };
}
