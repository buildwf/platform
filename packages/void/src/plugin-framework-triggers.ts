import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'pathslash';
import { normalizePath, type Plugin } from 'vite';
import { scanJobsSync, type JobDefinition } from './crons/scan.ts';
import { readProjectPaths } from './project-paths.ts';
import { scanQueuesSync, type QueueDefinition } from './queues/scan.ts';
type FrameworkTriggersOptions = {
  devTriggerToken: string;
};

const DISPATCH_FILE_MODE = 0o600;

/** Absolute path of the generated dispatch file. Stable across the dev process. */
export function frameworkTriggersDispatchPath(root: string): string {
  return join(root, '.void', 'dev-triggers.ts');
}

/**
 * Synchronously emit `<root>/.void/dev-triggers.ts`. We expose this directly
 * (in addition to the Vite plugin below) so callers like the Class A entry
 * wrapper can guarantee the file exists at the moment they reference it,
 * without depending on `configResolved` ordering.
 */
export function writeFrameworkTriggersDispatch(root: string, devTriggerToken: string): void {
  const paths = readProjectPaths(root);
  const jobs = scanJobsSync(paths.cronsDir);
  const queues = scanQueuesSync(paths.queuesDir);
  const target = frameworkTriggersDispatchPath(root);
  mkdirSync(dirname(target), { recursive: true });
  // Owner-only, like `.void/dev-trigger-token`: this module embeds the same
  // token, and it is the inbox's whole credential (see `getOrCreateDevTriggerToken`).
  // `mode` applies only when the file is created, so a file left by an
  // earlier release is tightened after the rewrite — best-effort, and not on
  // Windows, where `chmod` has no group/other bits to clear.
  writeFileSync(
    target,
    generateModule(paths.cronsDir, paths.queuesDir, jobs, queues, devTriggerToken),
    { mode: DISPATCH_FILE_MODE },
  );
  if (process.platform !== 'win32') {
    try {
      chmodSync(target, DISPATCH_FILE_MODE);
    } catch {
      // ignore
    }
  }
}

/**
 * Writes a real file at `<root>/.void/dev-triggers.ts` exporting
 * `handleDevTrigger(request, env, ctx)`. We use a real file (not a Vite
 * virtual module) because Nitro has its own server bundler that doesn't go
 * through Vite's plugin pipeline. The framework injection code imports
 * this path at runtime to dispatch cron and queue handlers
 * with the framework adapter's real bindings.
 */
export function frameworkTriggersPlugin(root: string, options: FrameworkTriggersOptions): Plugin {
  const writeDispatch = () => writeFrameworkTriggersDispatch(root, options.devTriggerToken);
  const dispatchPath = frameworkTriggersDispatchPath(root);

  return {
    name: 'void:framework-triggers',
    apply: 'serve',
    configResolved() {
      writeDispatch();
    },
    configureServer(server) {
      // Re-emit on any cron/queue file mutation so add/remove and edits to
      // the schedule string or queue name (which are baked into the
      // generated `__jobs`/`__queues` table at codegen time) are picked up
      // without a full restart.
      //
      // Watcher paths are native (backslashes on Windows); normalize before comparing.
      const paths = readProjectPaths(root);
      const cronsPrefix = normalizePath(paths.cronsDir);
      const queuesPrefix = normalizePath(paths.queuesDir);
      const isInteresting = (file: string) => {
        const normalized = normalizePath(file);
        return normalized.startsWith(cronsPrefix) || normalized.startsWith(queuesPrefix);
      };
      const onChange = (file: string) => {
        if (!isInteresting(file)) {
          return;
        }
        writeDispatch();
        // In the Class A composition, `envPlugin.config` ignores `.void/` in the
        // watcher, so Vite never invalidates the cached dispatch module itself.
        for (const env of Object.values(server.environments)) {
          const mod = env.moduleGraph.getModuleById(dispatchPath);
          if (mod) {
            env.moduleGraph.invalidateModule(mod);
          }
        }
      };
      server.watcher.on('add', onChange);
      server.watcher.on('change', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

function generateModule(
  cronsDir: string,
  queuesDir: string,
  jobs: Array<JobDefinition>,
  queues: Array<QueueDefinition>,
  devTriggerToken: string,
): string {
  const jobImports = jobs
    .map(
      (job, jobIndex) =>
        `import __job${jobIndex} from ${JSON.stringify(join(cronsDir, job.filePath))};`,
    )
    .join('\n');
  const queueImports = queues
    .map(
      (queue, queueIndex) =>
        `import __queue${queueIndex} from ${JSON.stringify(join(queuesDir, queue.filePath))};`,
    )
    .join('\n');

  const jobTable = jobs
    .map((job, jobIndex) => `  { crons: ${JSON.stringify(job.crons)}, handler: __job${jobIndex} }`)
    .join(',\n');
  const queueTable = queues
    .map(
      (queue, queueIndex) =>
        `  { name: ${JSON.stringify(queue.name)}, handler: __queue${queueIndex} }`,
    )
    .join(',\n');

  return `// @ts-nocheck — Auto-generated by Void in dev. Do NOT edit. Regenerated on every config load.
${jobImports}
${queueImports}

const __DEV_TRIGGER_TOKEN = ${JSON.stringify(devTriggerToken)};

const __jobs = [
${jobTable}
];

const __queues = [
${queueTable}
];

function __json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Dev only: production framework Workers dispatch through cli/wrapper.ts.
function __authorize(request) {
  return request.headers.get("x-void-dev-trigger") === __DEV_TRIGGER_TOKEN;
}

function __wrapMessage(m, decisions) {
  let decided = false;
  return {
    id: m.id,
    timestamp: new Date(m.timestamp),
    body: m.body,
    attempts: m.attempts,
    ack() {
      if (!decided) {
        decided = true;
        decisions.set(m.id, { action: "ack" });
      }
    },
    retry(opts) {
      if (!decided) {
        decided = true;
        decisions.set(m.id, {
          action: "retry",
          ...(opts?.delaySeconds != null ? { delaySeconds: opts.delaySeconds } : {}),
        });
      }
    },
  };
}

async function __dispatchScheduled(request, env, ctx) {
  const { cron, scheduledTime } = await request.json();
  const jobs = __jobs.filter((j) => j.crons.includes(cron));
  if (jobs.length === 0) {
    return __json({ error: \`No cron handler matches "\${cron}"\` }, 404);
  }
  const controller = { cron, scheduledTime, noRetry() {} };
  const executionContext = ctx ?? { waitUntil() {}, passThroughOnException() {} };
  const results = await Promise.allSettled(jobs.map(async (job) => {
    await job.handler(controller, env, executionContext);
  }));
  const errors = results.filter((result) => result.status === "rejected").map((result) => result.reason);
  if (errors.length) throw new AggregateError(errors, "Scheduled jobs failed");
  return __json({ ok: true });
}

async function __dispatchQueue(request, env) {
  const payload = await request.json();
  // Exact match only — payload.queue is the user-typed queue name from the
  // dev curl. The prod platform-side dispatch suffix-matches against
  // project-prefixed queue names, but that isn't relevant here and would
  // cause false positives between e.g. "events" and "user-events".
  const q = __queues.find((entry) => entry.name === payload.queue);
  if (!q) {
    return __json({ error: \`No queue handler matches "\${payload.queue}"\` }, 404);
  }
  const decisions = new Map();
  const messages = (payload.messages ?? []).map((m) => __wrapMessage(m, decisions));
  const batch = {
    queue: payload.queue,
    messages,
    ackAll() {
      for (const m of messages) m.ack();
    },
    retryAll(opts) {
      for (const m of messages) m.retry(opts);
    },
  };
  let ok = true;
  try {
    await q.handler(batch, env);
  } catch (err) {
    ok = false;
    console.error("[void] queue handler threw:", err);
  }
  return __json({
    ok,
    ...(decisions.size > 0 ? { decisions: Object.fromEntries(decisions) } : {}),
  });
}

/**
 * If \`request\` is a /__void/scheduled or /__void/queue trigger, validate auth,
 * dispatch, and return a \`Response\`. Otherwise return null so the caller can
 * forward to the framework's normal request handling.
 */
export async function handleDevTrigger(request, env, ctx) {
  if (request.method !== "POST") return null;
  const url = new URL(request.url);
  if (url.pathname !== "/__void/scheduled" && url.pathname !== "/__void/queue") {
    return null;
  }
  if (!__authorize(request)) {
    return __json({ error: "unauthorized" }, 401);
  }
  if (url.pathname === "/__void/scheduled") {
    return __dispatchScheduled(request, env, ctx);
  }
  return __dispatchQueue(request, env);
}
`;
}

/** Remove `lines` from the project's `.gitignore`, if it still exists. */
/**
 * Writes a tiny Nitro server middleware to the user's project so
 * `/__void/scheduled` and `/__void/queue` are intercepted inside Nitro's
 * request pipeline (where `event.context.cloudflare?.env` is populated).
 *
 * Nitro discovers middleware from `<serverDir>/middleware/*.ts`. Nuxt scans
 * `server/`, Analog scans `src/server/`, so the caller specifies which.
 * To keep the generated file out of git we append a `.gitignore` entry,
 * and the file is removed when the dev server stops.
 */
/**
 * Analog-specific injection. Analog's @analogjs/vite-plugin-nitro registers
 * user "server middleware" on Vite's connect pipeline (deliberately, to keep
 * some routes out of Nitro), so Nitro plugins like nitro-cloudflare-dev never
 * run for it and `event.context.cloudflare` is empty there.
 *
 * Workaround: put the actual handlers at `src/server/routes/api/__void/{cron,queue}-trigger.ts`
 * — Nitro *does* run plugins for routes — and proxy `/__void/{scheduled,queue}`
 * to `/api/__void/{cron,queue}-trigger` from a small Vite middleware so the
 * user-facing URL stays consistent with the other frameworks.
 */
/**
 * The dev servers in this process that use the middleware Void wrote, by file path. Astro restarts
 * the dev server in the same process with a fresh config, so a new plugin instance (from a new
 * copy of this module, too) is set up before the old server closes. Kept on `globalThis` so both
 * see the same claim.
 */
/**
 * Whether the Astro app has middleware that Void did not write. Void cannot add its dev trigger
 * middleware then, so the wrapper around Astro's Cloudflare server entry answers the triggers.
 */
/** The Worker entry from the app's Cloudflare config, unless it is Astro's server entry. */
/**
 * Writes a tiny Astro middleware to the user's project so
 * `/__void/scheduled` and `/__void/queue` are intercepted inside Astro's
 * request pipeline, with bindings from `cloudflare:workers`. Astro runs
 * middleware for a custom Worker entry too.
 *
 * Astro middleware lives at a single discoverable entry, so if the user
 * already has `src/middleware.ts` we don't overwrite it. The wrapper around
 * Astro's Cloudflare server entry answers the triggers then. A custom Worker
 * entry can skip that server entry, so we warn when the app sets one.
 *
 * If we wrote the file we remove it when the last dev server using it closes,
 * so the user's source tree stays clean. `src/middleware.ts` belongs to the
 * user, so the `.gitignore` line we add for it is removed too; otherwise a
 * middleware they write later would be silently left out of git.
 */
