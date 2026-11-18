export const BWF_SOCIAL_AUTH_PROVIDERS = [
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

export const BWF_EMAIL_AUTH_PROVIDER = 'email';

export const NOSAM_AUTH_PROVIDERS: readonly [
  typeof BWF_EMAIL_AUTH_PROVIDER,
  ...typeof BWF_SOCIAL_AUTH_PROVIDERS,
] = [BWF_EMAIL_AUTH_PROVIDER, ...BWF_SOCIAL_AUTH_PROVIDERS] as const;

export type BwfSocialAuthProvider = (typeof BWF_SOCIAL_AUTH_PROVIDERS)[number];
export type BwfAuthProvider = (typeof NOSAM_AUTH_PROVIDERS)[number];

const NOSAM_SOCIAL_AUTH_PROVIDER_SET = new Set<string>(BWF_SOCIAL_AUTH_PROVIDERS);
const NOSAM_AUTH_PROVIDER_SET = new Set<string>(NOSAM_AUTH_PROVIDERS);

export function isBwfSocialAuthProvider(value: string): value is BwfSocialAuthProvider {
  return NOSAM_SOCIAL_AUTH_PROVIDER_SET.has(value);
}

export function isBwfAuthProvider(value: string): value is BwfAuthProvider {
  return NOSAM_AUTH_PROVIDER_SET.has(value);
}

/** Provider options other than the client credentials, with the env var that holds each one. */
const NOSAM_AUTH_PROVIDER_SETTING_ENV_NAMES: Partial<
  Record<BwfSocialAuthProvider, Record<string, string>>
> = {
  cognito: {
    domain: 'AUTH_COGNITO_DOMAIN',
    region: 'AUTH_COGNITO_REGION',
    userPoolId: 'AUTH_COGNITO_USER_POOL_ID',
  },
};

export function getBwfAuthProviderSettingEnvNames(
  provider: BwfSocialAuthProvider,
): Record<string, string> {
  return NOSAM_AUTH_PROVIDER_SETTING_ENV_NAMES[provider] ?? {};
}

export function getBwfAuthProviderEnvNames(provider: BwfSocialAuthProvider): {
  clientId: string;
  clientSecret: string;
} {
  const normalized = provider.toUpperCase().replaceAll('-', '_');
  return {
    clientId: `AUTH_${normalized}_CLIENT_ID`,
    clientSecret: `AUTH_${normalized}_CLIENT_SECRET`,
  };
}
