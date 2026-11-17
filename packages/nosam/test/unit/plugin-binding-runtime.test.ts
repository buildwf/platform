import { describe, expect, it } from 'vite-plus/test';
import { bindingRuntimePlugin } from '../../src/plugin-binding-runtime.ts';
import { getHookHandler } from '../helpers/vite-hooks.ts';

describe('bindingRuntimePlugin', () => {
  it('uses custom binding names in KV and R2 runtime helpers', () => {
    const plugin = bindingRuntimePlugin({ kv: 'myapp_kv', r2: 'myapp_storage' });
    const resolveId = getHookHandler(plugin.resolveId) as (
      this: { environment: { name: string } },
      source: string,
      importer: string | undefined,
      options: { isEntry: boolean },
    ) => string | undefined;
    const load = getHookHandler(plugin.load) as (this: object, id: string) => string;

    const kvId = resolveId.call({ environment: { name: 'ssr' } }, 'nosam/kv', undefined, {
      isEntry: false,
    });
    expect(kvId).toBe('\0virtual:nosam-kv');
    expect(
      resolveId.call({ environment: { name: 'client' } }, 'nosam/kv', undefined, {
        isEntry: false,
      }),
    ).toBeUndefined();
    const kvCode = load.call({}, kvId!);
    expect(kvCode).toContain('requireRuntimeBinding("myapp_kv")');
    expect(kvCode).not.toContain('requireRuntimeBinding("KV")');

    const storageId = resolveId.call({ environment: { name: 'ssr' } }, 'nosam/storage', undefined, {
      isEntry: false,
    });
    expect(storageId).toBe('\0virtual:nosam-storage');
    const storageCode = load.call({}, storageId!);
    expect(storageCode).toContain('requireRuntimeBinding("myapp_storage")');
    expect(storageCode).not.toContain('requireRuntimeBinding("STORAGE")');
  });
});
