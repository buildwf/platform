import { type Plugin } from 'vite';

export function createClientStubsPlugin(): Plugin {
  const STUB_PREFIX = '\0nosam-client-stub:';
  const SERVER_ONLY_STUBS: Record<string, string> = {
    '@buildwf/bwf/db': 'export const db = {}; export const createDb = () => ({});',
    '@buildwf/bwf/kv': 'export const kv = {}; export const createKV = () => ({});',
    '@buildwf/bwf/ai': 'export const ai = {};',
    '@buildwf/bwf/queues': 'export const queues = {};',
    '@buildwf/bwf/storage': 'export const storage = {}; export const createStorage = () => ({});',
    // Client stub must mirror the real runtime/sandbox.ts surface so any
    // client-side `instanceof` check for either runtime error doesn't crash with a
    // TypeError, and async `await getSandbox(...)` callers don't silently
    // mis-handle a sync return. Throwing here makes accidental client imports
    // fail loudly rather than returning a misleading bare `{}`.
    '@buildwf/bwf/sandbox': `
      export class SandboxLimitError extends Error {
        constructor(reason = 'concurrency', message) {
          super(message ?? 'Sandbox limit reached: ' + reason);
          this.name = 'SandboxLimitError';
          this.reason = reason;
        }
      }
      export class SandboxUnavailableError extends Error {
        constructor(message = 'Managed Sandbox is unavailable on this bwf platform.') {
          super(message);
          this.name = 'SandboxUnavailableError';
        }
      }
      export async function getSandbox() {
        throw new Error('@buildwf/bwf/sandbox is server-only and cannot be imported by browser code.');
      }
      export const sandbox = { get: getSandbox };
    `,
    // `@buildwf/bwf/email` reaches `runtime/env-raw.ts` (`node:async_hooks`), so an
    // unstubbed client import builds with only a warning and white-screens on
    // load. `@buildwf/bwf/email/testing` needs its own entry (the filter is anchored)
    // because it pulls build-time router code and Node built-ins. Both throw,
    // like `@buildwf/bwf/sandbox`, so an accidental client send fails legibly instead
    // of silently no-oping.
    '@buildwf/bwf/email': `
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
    '@buildwf/bwf/email/testing': `
      const serverOnly = (name) => () => {
        throw new Error(name + ' is server-only and cannot be imported by browser code.');
      };
      export const createEmailTestHarness = serverOnly('createEmailTestHarness');
      export const createInboundTestHarness = serverOnly('createInboundTestHarness');
    `,
    '@buildwf/bwf/live': '',
    '@buildwf/bwf/durable': '',
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
          if (id === '@buildwf/bwf/live' || id === '@buildwf/bwf/durable') {
            this.error(
              id === '@buildwf/bwf/live'
                ? '@buildwf/bwf/live is server-only and cannot be imported by browser code. Import bwf/live/client instead.'
                : '@buildwf/bwf/durable is server-only and cannot be imported by browser code.',
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
