import { type ApplicationAnalysis } from '../../application-analysis.ts';
import { type VoidConfig } from '../../config.ts';
import { assertNoRootSourceConventionConflicts } from '../../project-paths.ts';
import { getErrorMessage } from '../output.ts';
import { detectPreset, hasBackendFiles } from '../preset.ts';
import { syncWranglerDurableObjects, syncWranglerWebSockets } from '../wrangler.ts';

export type CloudflareDeployAppOptions = {
  dir?: string;
  spa?: boolean;
};

export type CloudflareDeployAppClassification =
  | { supported: true }
  | { supported: false; reason: string };

/**
 * Narrow native Cloudflare deploys to app shapes whose emitted Worker artifact
 * the current verifier understands. This runs before any account operation.
 */
export function classifyCloudflareDeployApp(
  root: string,
  voidConfig: VoidConfig,
  options: CloudflareDeployAppOptions,
  application: ApplicationAnalysis,
): CloudflareDeployAppClassification {
  const staticPreset = detectPreset(root, { dir: options.dir, spa: options.spa });
  const configuredStatic =
    voidConfig.inference?.appType === 'static' || voidConfig.inference?.appType === 'spa';
  if (staticPreset || configuredStatic || options.dir || options.spa) {
    const appType = staticPreset?.appType ?? (options.spa ? 'spa' : 'static');
    return unsupported(
      [
        `deploy: --platform cloudflare could not resolve the ${appType} output to deploy.`,
        'Set inference.outputDir in void.config.ts, pass --dir with an existing build directory,',
        'or add a supported build tool so Nosam can locate the generated static assets.',
      ].join('\n'),
    );
  }

  if (!hasBackendFiles(root)) {
    return unsupported(
      [
        'deploy: --platform cloudflare found no Nosam backend to deploy.',
        'A full Nosam app has at least one of: routes/, middleware, crons/, queues/, or email/.',
        'Add your server code, or use `void deploy` for a static site.',
      ].join('\n'),
    );
  }

  try {
    const paths = application.paths;
    assertNoRootSourceConventionConflicts(paths);
    syncWranglerDurableObjects(root, application.durableObjects);
    syncWranglerWebSockets(root, application.websockets);
  } catch (error) {
    return unsupported(`deploy: ${getErrorMessage(error)}`);
  }

  return { supported: true };
}

function unsupported(reason: string): CloudflareDeployAppClassification {
  return { supported: false, reason };
}
