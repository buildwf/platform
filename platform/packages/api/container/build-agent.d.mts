// Decision: Type declarations for the container build agent. `build-agent.mjs` is plain JavaScript (this
// package has no `allowJs`), so NodeNext pairs it with this `.d.mts`, letting the unit test
// import the exported helpers without a `@ts-expect-error`. Only the test-exercised surface is
// declared; the agent's behavior and its docs live in build-agent.mjs. Not copied into the
// container image (the Dockerfile copies build-agent.mjs and the public SDK manifest).

export const SCRUBBED_ENV_VARS: ReadonlyArray<string>;

export const BUILDER_UID: number;
export const BUILDER_GID: number;
export const BUILDER_HOME: string;

export function builderCacheEnv(): Record<string, string>;

export function nonInteractiveEnv(): Record<string, string>;

export const DEFAULT_PLATFORM_CLI_VERSION: string;

export const SOURCE_STALL_TIMEOUT_MS: number;
export const SOURCE_PHASE_BUDGET_MS: number;
export const SOURCE_DOWNLOAD_MAX_ATTEMPTS: number;
export const SOURCE_RETRY_BACKOFF_MS: ReadonlyArray<number>;
export const SOURCE_PROGRESS_INTERVAL_MS: number;
export const EXTRACT_KILL_GRACE_MS: number;

export function isRetryableSourceStatus(
  status: number,
  headers?: { get(name: string): string | null } | null,
  body?: string,
): boolean;

export const SECONDARY_RATE_LIMIT_PATTERN: RegExp;
export const ERROR_BODY_SNIFF_BYTES: number;
export const SECONDARY_RATE_LIMIT_DELAY_MS: number;

export function parseRetryAfterMs(
  headers?: { get(name: string): string | null } | null,
  now?: number,
): number | null;

export function extractTarball(
  body: unknown,
  options?: {
    onBytes?: (length: number) => void;
    signal?: AbortSignal;
    spawnImpl?: (
      cmd: string,
      args: ReadonlyArray<string>,
      opts: unknown,
    ) => import('node:child_process').ChildProcess;
    killGraceMs?: number;
  },
): Promise<void>;

export interface DownloadSourceOptions {
  fetchImpl?: typeof fetch;
  extract?: (
    body: unknown,
    options?: { onBytes?: (length: number) => void; signal?: AbortSignal },
  ) => Promise<void>;
  resetWorkDir?: () => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  isCancelled?: () => boolean;
  stallTimeoutMs?: number;
  phaseBudgetMs?: number;
  maxAttempts?: number;
  backoffMs?: ReadonlyArray<number>;
  progressIntervalMs?: number;
}

export function downloadSource(options?: DownloadSourceOptions): Promise<void>;

export function childSpawnOptions(): {
  cwd: string;
  stdio: ReadonlyArray<'ignore' | 'pipe' | 'inherit'>;
  uid: number;
  gid: number;
};

export const MAX_BUFFERED_LOG_LINES: number;

export const MAX_PENDING_LOG_LINES: number;
export const MAX_LOG_RESPONSE_BYTES: number;
export const MAX_BUFFERED_LOG_BYTES: number;
export function clearBufferedLogLines(): void;
export const MAX_LOG_RESPONSE_LINES: number;

export const MAX_PARTIAL_LINE_CHARS: number;

export function pipeStream(source: NodeJS.ReadableStream, stream: 'stdout' | 'stderr'): void;

export function record(
  line: string,
  stream: 'stdout' | 'stderr',
  lineEnding?: 'cr' | 'lf' | 'crlf' | 'none',
): void;

export function flushLogs(): Promise<void>;

export function getBufferedLogLines(): ReadonlyArray<{
  seq: number;
  line: string;
  stream: 'stdout' | 'stderr';
  ts: number;
  lineEnding?: 'cr' | 'lf' | 'crlf' | 'none';
}>;

export function getPendingLogLineCount(): number;

export function sanitizeChildEnv(
  baseEnv: Record<string, string | undefined>,
  extra?: Record<string, string | undefined>,
): Record<string, string>;

export function startControlServer(port?: number): Promise<import('node:http').Server>;

export function getServedLogSeq(): number;

export function getAckedLogSeq(): number;

export const LOG_DRAIN_IDLE_TIMEOUT_MS: number;
export const LOG_DRAIN_ABSOLUTE_TIMEOUT_MS: number;
export const LOG_DRAIN_POLL_MS: number;

export function waitForLogDrain(options?: {
  timeoutMs?: number;
  idleTimeoutMs?: number;
  pollMs?: number;
  served?: () => number;
  recorded?: () => number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): Promise<boolean>;

export function closeControlServer(server: unknown): Promise<void>;

export function finishBuildLogging(
  server: unknown,
  drainOptions?: {
    timeoutMs?: number;
    idleTimeoutMs?: number;
    pollMs?: number;
    served?: () => number;
    recorded?: () => number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  },
): Promise<void>;

export function parseProcStatusUid(statusText: string): number | null;

export function installShutdownHandlers(): void;

export interface RunBuildDeps {
  downloadSource?: () => Promise<void>;
  resolveInstall?: () => { manager: string; cmd: string; args: ReadonlyArray<string> };
  runChild?: (
    cmd: string,
    args: ReadonlyArray<string>,
    opts?: { env?: Record<string, string | undefined> },
  ) => Promise<number>;
  reportStatus?: (status: string) => Promise<void>;
  hasLocalBwf?: () => boolean;
  resolveSourceBwfCli?: () => string | null;
  chownWorkDir?: () => Promise<void>;
  killBuilderProcesses?: () => Promise<void>;
}

export function runBuild(deps?: RunBuildDeps): Promise<number>;
export function resolveSourceBwfCli(root?: string): string | null;
