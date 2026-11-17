import { describe, expect, it } from 'vite-plus/test';
import { isNosamSecretOnlyDraft, isWranglerSecretOnlyDraft } from '../../src/secret-draft.ts';
import { apiSecretDraftVersion, nosamSecretDraftVersion } from '../secret-draft-fixture.ts';

describe('immutable SDK secret draft proof', () => {
  it('recognizes the placeholder that the secret transport deploys in one request', () => {
    const draft = apiSecretDraftVersion();
    expect(isNosamSecretOnlyDraft(draft)).toBe(true);
    expect(isNosamSecretOnlyDraft({ ...draft, source: 'cf_cli' })).toBe(false);
    expect(isNosamSecretOnlyDraft({ ...draft, source: 'dash' })).toBe(false);
    expect(
      isNosamSecretOnlyDraft({
        ...draft,
        annotations: { ...draft.annotations, 'workers/tag': 'release' },
      }),
    ).toBe(false);
    expect(
      isNosamSecretOnlyDraft({
        ...draft,
        annotations: { 'workers/triggered_by': 'create_version_api' },
      }),
    ).toBe(false);
    expect(isNosamSecretOnlyDraft({ ...draft, bindings: [], env: {} })).toBe(false);
  });

  it('recognizes the actual cf placeholder without treating its compatibility date as proof', () => {
    const draft = nosamSecretDraftVersion();
    expect(isWranglerSecretOnlyDraft(draft)).toBe(false);
    expect(isNosamSecretOnlyDraft(draft)).toBe(true);
    expect(isNosamSecretOnlyDraft({ ...draft, modules: undefined })).toBe(false);
  });

  it.each([
    [
      'application code',
      {
        modules: [
          {
            name: 'index.js',
            content_type: 'application/javascript+module',
            content_base64: Buffer.from(
              'export default { fetch() { return new Response("application"); } };\n',
            ).toString('base64'),
          },
        ],
      },
    ],
    [
      'another module',
      {
        modules: [
          ...nosamSecretDraftVersion().modules,
          { name: 'data.txt', content_type: 'text/plain', content_base64: '' },
        ],
      },
    ],
    ['different main', { main_module: 'other.js' }],
    ['stateful exports', { exports: { Room: { type: 'durable-object' } } }],
    ['assets', { assets: {} }],
    ['settings', { compatibility_flags: ['nodejs_compat'] }],
    [
      'a different annotation',
      { annotations: { 'workers/triggered_by': 'secret', 'workers/message': 'an application' } },
    ],
    [
      'a non-secret resource',
      {
        bindings: [
          ...nosamSecretDraftVersion().bindings,
          { name: 'KV', type: 'kv_namespace', namespace_id: 'foreign' },
        ],
      },
    ],
    ['a secret key', { bindings: [{ name: 'TOKEN', type: 'secret_key' }] }],
    ['a secret value', { bindings: [{ name: 'TOKEN', type: 'secret_text', text: 'private' }] }],
    [
      'duplicate bindings',
      { bindings: [...nosamSecretDraftVersion().bindings, ...nosamSecretDraftVersion().bindings] },
    ],
    [
      'a contradictory env',
      { env: { TOKEN: { type: 'secret_text' }, OTHER: { type: 'text', value: 'private' } } },
    ],
    ['a public version URL', { urls: ['https://version.example.workers.dev'] }],
    ['an unknown uploader', { source: 'api' }],
    [
      'contradictory adapter bindings',
      { resources: { bindings: [{ name: 'OTHER', type: 'secret_text' }] } },
    ],
  ])('refuses %s', (_name, patch) => {
    expect(isNosamSecretOnlyDraft({ ...nosamSecretDraftVersion(), ...patch })).toBe(false);
  });

  it('accepts only the adapter compatibility binding view, independent of object key order', () => {
    expect(
      isNosamSecretOnlyDraft({
        ...nosamSecretDraftVersion(),
        resources: { bindings: [{ type: 'secret_text', name: 'TOKEN' }] },
      }),
    ).toBe(true);
  });
});
