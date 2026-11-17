import { expect, it } from 'vite-plus/test';
import { platformAppUploadUserAgent } from '../../src/deploy/user-agent.ts';

it('attributes self-hosted uploads to their installation and runtime version', () => {
  expect(
    platformAppUploadUserAgent({
      PLATFORM_VERSION: '0.27.0',
      PLATFORM_INSTALLATION_ID: 'installation-one',
      PLATFORM_ENV: 'production',
    }),
  ).toBe('nosam-platform/0.27.0 nosam-installation/installation-one');
});

it.each([undefined, 'production', 'staging'])(
  'keeps hosted %s uploads distinct from self-hosted installations',
  (PLATFORM_ENV) => {
    expect(platformAppUploadUserAgent({ PLATFORM_ENV })).toBe(
      `nosam-platform/hosted nosam-installation/hosted-${PLATFORM_ENV || 'production'}`,
    );
  },
);

it('encodes custom runtime versions and installation IDs as single header tokens', () => {
  expect(
    platformAppUploadUserAgent({
      PLATFORM_VERSION: 'custom build\r\n',
      PLATFORM_INSTALLATION_ID: 'installation / one',
    }),
  ).toBe('nosam-platform/custom%20build%0D%0A nosam-installation/installation%20%2F%20one');
});
