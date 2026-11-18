import type { RedirectRule } from '@buildwf/deploy-core';

export type {
  AssetConfig,
  DeployAssetManifestEntry,
  DeployAssetUploadRequest,
  DeployEvent,
  DeployManifest,
  DeployTarget,
  DeployTargetAdapter,
  DeployUploadPayload,
  DeployWorkerInput,
  DeployWorkerModule,
  DeployWorkerUploadRequest,
  DeployWorkerUploadResponse,
  HeaderRule,
  LiveManifestMeta,
  QueueMeta,
  RedirectRule,
  SandboxManifestMeta,
  ScheduleMeta,
  WebSocketManifestMeta,
} from '@buildwf/deploy-core';

/** CLI- and development-only routing metadata, stripped before serialization. */
export type DevRedirectRule = RedirectRule & {
  force?: boolean;
  origin?: string;
};
