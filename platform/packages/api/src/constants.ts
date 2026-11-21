export const SITE_DOMAIN = 'buildwf.dev';
export const DEFAULT_DASHBOARD_URL = 'https://platform.buildwithfriends.dev';
export const DEFAULT_DISPATCH_NAMESPACE = 'platform-users';
export const MAX_SECRET_NAME_LENGTH = 256;
export const MAX_SECRET_VALUE_BYTES = 128 * 1024;

// Decision: TTL for a cached org-membership row in `github_installation_members`. The org-shared GitHub
// App flow re-verifies repo access on each connect; this cache only short-circuits the
// org-membership check while it's fresh.
export const MEMBERSHIP_TTL_SECONDS = 60 * 60 * 24;
