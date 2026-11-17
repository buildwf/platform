import { type Plugin } from 'vite';

export function createClientStubsPlugin(): Plugin {
  const STUB_PREFIX = '\0nosam-client-stub:';
  const SERVER_ONLY_STUBS: Record<string, string> = {
    'nosam/db': 'export const db = {}; export const createDb = () => ({});',
    'nosam/kv': 'export const kv = {}; export const createKV = () => ({});',
    'nosam/ai': 'export const ai = {};',
    'nosam/queues': 'export const queues = {};',
    'nosam/storage': 'export const storage = {}; export const createStorage = () => ({});',
    // Client stub must mirror the real runtime/sandbox.ts surface so any
    // client-side `instanceof` check for either runtime error doesn't crash with a
    // TypeError, and async `await getSandbox(...)` callers don't silently
    // mis-handle a sync return. Throwing here makes accidental client imports
    // fail loudly rather than returning a misleading bare `{}`.
    'nosam/sandbox': `
      export class SandboxLimitError extends Error {
        constructor(reason = 'concurrency', message) {
          super(message ?? 'Sandbox limit reached: ' + reason);
          this.name = 'SandboxLimitError';
          this.reason = reason;
        }
      }
      export class SandboxUnavailableError extends Error {
        constructor(message = 'Managed Sandbox is unavailable on this Nosam platform.') {
          super(message);
          this.name = 'SandboxUnavailableError';
        }
      }
      export async function getSandbox() {
        throw new Error('nosam/sandbox is server-only and cannot be imported by browser code.');
      }
      export const sandbox = { get: getSandbox };
    `,
    // `nosam/email` reaches `runtime/env-raw.ts` (`node:async_hooks`), so an
    // unstubbed client import builds with only a warning and white-screens on
    // load. `nosam/email/testing` needs its own entry (the filter is anchored)
    // because it pulls build-time router code and Node built-ins. Both throw,
    // like `nosam/sandbox`, so an accidental client send fails legibly instead
    // of silently no-oping.
    'nosam/email': `
      const serverOnly = (name) => () => {
        throw new Error(name + ' is server-only and cannot be imported by browser code.');
      };
      export const sendEmail = serverOnly('sendEmail');
      export const createEmail = serverOnly('createEmail');
      export const defineEmail = serverOnly('defineEmail');
      export const parseEmail = serverOnly('parseEmail');
      export const replyEmail = serverOnly('replyEmail');
      export const createMessageProxy = serverOnly('createMessageProxy');
    `,
    'nosam/email/testing': `
      const serverOnly = (name) => () => {
        throw new Error(name + ' is server-only and cannot be imported by browser code.');
      };
      export const createEmailTestHarness = serverOnly('createEmailTestHarness');
      export const createInboundTestHarness = serverOnly('createInboundTestHarness');
    `,
    'nosam/live': '',
    'nosam/durable': '',
  };
  const STUB_RESOLVE_FILTER = new RegExp(
    `^(${Object.keys(SERVER_ONLY_STUBS).join('|').replaceAll('/', '\\/')})$`,
  );
  // eslint-disable-next-line no-control-regex -- Vite virtual module null-byte prefix
  const STUB_LOAD_FILTER = new RegExp(`^\\0nosam-client-stub:`);

  const clientStubsPlugin: Plugin = {
    name: 'nosam:client-stubs',
    enforce: 'pre',
    resolveId: {
      filter: { id: STUB_RESOLVE_FILTER },
      handler(id) {
        if (this.environment?.name === 'client') {
          if (id === 'nosam/live' || id === 'nosam/durable') {
            this.error(
              id === 'nosam/live'
                ? 'nosam/live is server-only and cannot be imported by browser code. Import nosam/live/client instead.'
                : 'nosam/durable is server-only and cannot be imported by browser code.',
            );
          }
          return STUB_PREFIX + id;
        }
      },
    },
    load: {
      filter: { id: STUB_LOAD_FILTER },
      handler(id) {
        return SERVER_ONLY_STUBS[id.slice(STUB_PREFIX.length)] ?? 'export default {};';
      },
    },
  };

  return clientStubsPlugin;
}
