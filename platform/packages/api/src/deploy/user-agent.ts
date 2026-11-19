import type { ApiEnv } from '../env.ts';

/** Identify uploads made by the platform, independently of the initiating client. */
export function platformAppUploadUserAgent(
  env: Pick<ApiEnv['Bindings'], 'PLATFORM_VERSION' | 'PLATFORM_INSTALLATION_ID' | 'PLATFORM_ENV'>,
): string {
  const version = env.PLATFORM_VERSION || 'hosted';
  const installationId =
    env.PLATFORM_INSTALLATION_ID || `hosted-${env.PLATFORM_ENV || 'production'}`;
  return `platform/${encodeURIComponent(version)} platform-installation/${encodeURIComponent(installationId)}`;
}
