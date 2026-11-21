import { defineConfig } from '@builtbyfriends/bwf/config';

export default defineConfig({
  routing: {
    headers: {
      // Decision: No dashboard page is meant to be framed; this covers the SPA shell served from assets.
      '/*': ['X-Frame-Options: DENY', "Content-Security-Policy: frame-ancestors 'none'"],
    },
  },
  cloudflare: {
    name: 'platform-dashboard',
    compatibility_date: '2026-02-12',
    assets: {
      directory: 'dist/client',
    },
    routes: [
      {
        pattern: 'dash.void.cloud',
        custom_domain: true,
      },
    ],
    services: [
      {
        binding: 'API',
        service: 'platform-api',
      },
    ],
    env: {
      production: {
        name: 'platform-dashboard',
        routes: [
          {
            pattern: 'dash.void.cloud',
            custom_domain: true,
          },
        ],
        services: [
          {
            binding: 'API',
            service: 'platform-api',
          },
        ],
      },
      staging: {
        name: 'platform-dashboard-staging',
        routes: [
          {
            pattern: 'dash.staging.void.cloud',
            custom_domain: true,
          },
        ],
        services: [
          {
            binding: 'API',
            service: 'platform-api-staging',
          },
        ],
        vars: {
          API_URL: 'https://api.staging.void.cloud',
          SITE_DOMAIN: 'staging.void.app',
        },
      },
    },
  },
});
