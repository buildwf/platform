export type PlatformWorkerName =
  | 'proxy'
  | 'email-gateway'
  | 'tail'
  | 'api'
  | 'dashboard'
  | 'dispatch';

type PlatformWorkerDef = Readonly<{
  name: PlatformWorkerName;
  prodScript: string;
  stagingScript: string;
  dependsOn: ReadonlyArray<PlatformWorkerName>;
  deployOrder: number;
}>;

export type PlatformWorker = PlatformWorkerDef & {
  dependedBy: ReadonlyArray<PlatformWorkerName>;
};

// Decision: `deployOrder` follows the platform deploy script; rollback-all runs it in reverse. The API's
// confirmation page posts back through the email gateway, so the gateway ships before the API and
// rolls back after it. The dispatcher's private preview entrypoint must also exist before the API
// binds to it.
const WORKER_DEFS: ReadonlyArray<PlatformWorkerDef> = [
  {
    name: 'proxy',
    prodScript: 'platform-proxy',
    stagingScript: 'platform-proxy-staging',
    dependsOn: [],
    deployOrder: 1,
  },
  {
    name: 'email-gateway',
    prodScript: 'platform-email-gateway',
    stagingScript: 'platform-email-gateway-staging',
    dependsOn: [],
    deployOrder: 2,
  },
  {
    name: 'tail',
    prodScript: 'platform-tail',
    stagingScript: 'platform-tail-staging',
    dependsOn: [],
    deployOrder: 3,
  },
  {
    name: 'api',
    prodScript: 'platform-api',
    stagingScript: 'platform-api-staging',
    dependsOn: ['proxy', 'email-gateway', 'dispatch'],
    deployOrder: 5,
  },
  {
    name: 'dashboard',
    prodScript: 'platform-dashboard',
    stagingScript: 'platform-dashboard-staging',
    dependsOn: ['api'],
    deployOrder: 6,
  },
  {
    name: 'dispatch',
    prodScript: 'platform-dispatch',
    stagingScript: 'platform-dispatch-staging',
    dependsOn: ['proxy', 'tail'],
    deployOrder: 4,
  },
];

export const PLATFORM_WORKERS: ReadonlyArray<PlatformWorker> = WORKER_DEFS.map((def) => ({
  ...def,
  dependedBy: WORKER_DEFS.filter((other) => other.dependsOn.includes(def.name)).map(
    (other) => other.name,
  ),
}));

export type PlatformEnv = 'production' | 'staging';

export function getScriptName(worker: PlatformWorker, env: PlatformEnv): string {
  return env === 'staging' ? worker.stagingScript : worker.prodScript;
}

export function getWorkerByName(name: string): PlatformWorker | undefined {
  return PLATFORM_WORKERS.find((w) => w.name === name);
}
