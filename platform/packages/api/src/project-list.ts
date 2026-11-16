import type { getLatestDeploymentsByProjectIds } from './db.ts';
import type { ProjectRole, Project, User } from './types.ts';

export type ProjectListItem = Project & {
  role: ProjectRole;
  owner: Pick<User, 'id' | 'login'>;
  url?: string;
  custom_domain: string | null;
  latest_deployment: Awaited<ReturnType<typeof getLatestDeploymentsByProjectIds>> extends Map<
    string,
    infer Deployment
  >
    ? Deployment | null
    : null;
  traffic: {
    requests5m: number;
    lastSeenAt: string | null;
    sparkline5m: ReadonlyArray<number>;
  };
  health: {
    responses4xx15m: number;
    responses5xx15m: number;
    errorRate5xx15m: number;
  };
};

function deployAttentionScore(status: string | null | undefined): number {
  if (status === 'failed') {
    return 4;
  }
  if (
    status === 'pending' ||
    status === 'uploading' ||
    status === 'migrating' ||
    status === 'cutover' ||
    status === 'compensating' ||
    status === 'canceling'
  ) {
    return 3;
  }
  if (status === 'canceled') {
    return 1;
  }
  return 0;
}

function projectListSortScore(project: ProjectListItem): number {
  const hasRecentErrors = project.health.responses5xx15m > 0 ? 2 : 0;
  return Math.max(deployAttentionScore(project.latest_deployment?.status), hasRecentErrors);
}

function parseSortDate(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function sortProjectList(a: ProjectListItem, b: ProjectListItem): number {
  const attentionDelta = projectListSortScore(b) - projectListSortScore(a);
  if (attentionDelta !== 0) {
    return attentionDelta;
  }

  const deployDelta =
    parseSortDate(b.latest_deployment?.created_at) - parseSortDate(a.latest_deployment?.created_at);
  if (deployDelta !== 0) {
    return deployDelta;
  }

  const trafficDelta = b.traffic.requests5m - a.traffic.requests5m;
  if (trafficDelta !== 0) {
    return trafficDelta;
  }

  return a.slug.localeCompare(b.slug);
}

/** Remove plaintext environment values from manifests returned to read-only callers. */
export function sanitizeDeploymentManifest(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  delete parsed.vars;
  return JSON.stringify(parsed);
}
