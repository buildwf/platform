import { sql as drizzleSql } from 'drizzle-orm';
import { Hono } from 'hono';
import { findMissingR2Assets, persistedR2AssetSizes } from '../asset-inventory.ts';
import { activeOAuthApproval, OAuthError } from '../auth/oauth.ts';
import { uploadPool } from '../concurrency.ts';
import { getProject, getUser, getDeployment, updateDeploymentStatus, type Db } from '../db.ts';
import { handleManifestOnlyDeploy } from '../deploy/execute.ts';
import { requireActiveDeployAccess } from '../deploy/recovery.ts';
import {
  HEX_32_REGEX,
  MAX_UPLOAD_URLS_BATCH,
  moduleContentType,
  workerUploadModulesProblem,
  type UploadUrlsRequestAsset,
  type WorkerUploadModule,
} from '../deploy/shared.ts';
import {
  appendDeploymentEvent,
  assertDeploymentExecutionAuthority,
  deploymentEventPage,
  deploymentInputModule,
  deploymentInputPrefix,
  getDeploymentOperation,
  type DeploymentOperation,
} from '../deployment-execution.ts';
import type { ApiEnv } from '../env.ts';
import { checkCliVersionOrRespond } from '../middleware/cli-version.ts';
import { createDeployLogger, type DeployLogger } from '../observability/logger.ts';
import { ProjectAccessDeniedError, projectAccessErrorBody } from '../project-access.ts';
import { ProjectRequiresNormalizationError, requireNormalizedProject } from '../project-state.ts';
import { presignAssetPut } from '../r2-presign.ts';
import { listR2Objects, type WorkerModule } from '../worker-upload.ts';
import { requireProjectRouteCapability } from './project-access.ts';

export { MAX_ROUTING_RULES, validateManifestShape } from '@void/deploy-core';

export async function executeQueuedDeployment(
  env: ApiEnv['Bindings'],
  db: Db,
  operation: DeploymentOperation,
  deadline: number,
): Promise<void> {
  const actor = await getUser(db, operation.actor_id);
  if (!actor) {
    await updateDeploymentStatus(
      db,
      operation.id,
      'failed',
      'Deployment actor is no longer active',
      { force: true },
    );
    await appendDeploymentEvent(db, operation.id, operation.owner_id!, {
      event: 'error',
      message: 'Deployment actor is no longer active',
      step: 'authorization',
    });
    return;
  }
  const initial = await getDeployment(db, operation.id);
  if (initial?.status === 'canceling' || initial?.status === 'canceled') {
    await updateDeploymentStatus(db, operation.id, 'canceled', undefined, { force: true });
    await appendDeploymentEvent(db, operation.id, operation.owner_id!, {
      event: 'error',
      message: initial.error_message ?? 'Deployment was canceled',
      step: 'canceled',
    });
    return;
  }
  try {
    await assertDeploymentExecutionAuthority(db, operation);
  } catch {
    await updateDeploymentStatus(
      db,
      operation.id,
      'failed',
      'Deployment actor or credential is no longer active',
      { force: true },
    );
    await appendDeploymentEvent(db, operation.id, operation.owner_id!, {
      event: 'error',
      message: 'Deployment actor or credential is no longer active',
      step: 'authorization',
    });
    return;
  }
  // One listing confirms every staged module and its size before execution
  // touches provider state, and supplies sizes for inputs staged before they
  // were recorded. Bytes stream from R2 during the Cloudflare upload and are
  // checked against their digests there.
  const workerFiles: Array<WorkerModule> = [];
  const staged = operation.payload.modules.length
    ? await listR2Objects(env.STATIC_ASSETS_R2, operation.input_prefix)
    : new Map<string, { size: number }>();
  for (const module of operation.payload.modules) {
    const object = staged.get(module.key);
    if (!object) {
      throw new Error('Durable deployment input is missing');
    }
    if (module.size !== undefined && module.size !== object.size) {
      throw new Error('Durable deployment input digest mismatch');
    }
    workerFiles.push(deploymentInputModule(env.STATIC_ASSETS_R2, module, object.size));
  }
  const executor = new Hono<ApiEnv>()
    .onError((error) => {
      throw error;
    })
    .use('*', async (context, next) => {
      context.set('db', db);
      context.set('user', actor);
      context.set('deployScope', operation.project_id);
      if (operation.payload.credentialId) {
        context.set('deployCredential', operation.payload.credentialId);
      }
      if (operation.payload.oauthApproval) {
        context.set('oauthApproval', operation.payload.oauthApproval);
      }
      if (operation.build_id) {
        context.set('deployBuild', operation.build_id);
      }
      context.set('deploymentExecution', { operation, workerFiles, deadline });
      await next();
    })
    .post('/:id/deploy', handleManifestOnlyDeploy);
  const response = await executor.fetch(
    new Request(`https://deployment.invalid/${operation.project_id}/deploy`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(operation.cli_version ? { 'x-void-cli-version': operation.cli_version } : {}),
      },
      body: JSON.stringify(operation.payload.body),
    }),
    env,
  );
  if (response.status !== 204) {
    // A rejected admitted input never entered the pipeline. No provider write
    // occurred, so its placeholder can be finalized without replaying it.
    await db.transaction(async (tx) => {
      await tx.execute(
        drizzleSql`SELECT id FROM projects WHERE id = ${operation.project_id} FOR UPDATE`,
      );
      const candidate = await getDeployment(tx, operation.id);
      if (!candidate || candidate.manifest !== null || candidate.status !== 'pending') {
        throw new Error('Admitted deployment needs reconciliation');
      }
      await updateDeploymentStatus(
        tx,
        operation.id,
        'failed',
        'Admitted deployment is no longer authorized or valid',
        { force: true },
      );
    });
    await appendDeploymentEvent(db, operation.id, operation.owner_id!, {
      event: 'error',
      message: 'Admitted deployment is no longer authorized or valid',
      step: 'authorization',
    });
  }
}

export { databaseTimestampMs, settleDeploymentForSandboxDrain } from '../deploy/recovery.ts';

export {
  buildDurableObjectUploadMigrations,
  buildWebSocketUploadBindings,
  buildSandboxUploadBindings,
  buildLiveUploadBindings,
  enrichWebSocketManifest,
  enrichLiveManifest,
} from '../deploy/durable-bindings.ts';
