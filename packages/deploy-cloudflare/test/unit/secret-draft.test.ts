import { describe, expect, it } from 'vite-plus/test';
import { isBwfSecretOnlyDraft, isWranglerSecretOnlyDraft } from '../../src/secret-draft.ts';
import { apiSecretDraftVersion, bwfSecretDraftVersion } from '../secret-draft-fixture.ts';

describe('immutable SDK secret draft proof', () => {
  it('recognizes the placeholder that the secret transport deploys in one request', () => {
    const draft = apiSecretDraftVersion();
    expect(isBwfSecretOnlyDraft(draft)).toBe(true);
    expect(isBwfSecretOnlyDraft({ ...draft, source: 'cf_cli' })).toBe(false);
    expect(isBwfSecretOnlyDraft({ ...draft, source: 'dash' })).toBe(false);
    expect(
      isBwfSecretOnlyDraft({
        ...draft,
        annotations: { ...draft.annotations, 'workers/tag': 'release' },
      }),
    ).toBe(false);
    expect(
      isBwfSecretOnlyDraft({
        ...draft,
        annotations: { 'workers/triggered_by': 'create_version_api' },
      }),
    ).toBe(false);
    expect(isBwfSecretOnlyDraft({ ...draft, bindings: [], env: {} })).toBe(false);
  });

  it('recognizes the actual cf placeholder without treating its compatibility date as proof', () => {
    const draft = bwfSecretDraftVersion();
    expect(isWranglerSecretOnlyDraft(draft)).toBe(false);
    expect(isBwfSecretOnlyDraft(draft)).toBe(true);
    expect(isBwfSecretOnlyDraft({ ...draft, modules: undefined })).toBe(false);
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
          ...bwfSecretDraftVersion().modules,
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
          ...bwfSecretDraftVersion().bindings,
          { name: 'KV', type: 'kv_namespace', namespace_id: 'foreign' },
        ],
      },
    ],
    ['a secret key', { bindings: [{ name: 'TOKEN', type: 'secret_key' }] }],
    ['a secret value', { bindings: [{ name: 'TOKEN', type: 'secret_text', text: 'private' }] }],
    [
      'duplicate bindings',
      { bindings: [...bwfSecretDraftVersion().bindings, ...bwfSecretDraftVersion().bindings] },
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
    expect(isBwfSecretOnlyDraft({ ...bwfSecretDraftVersion(), ...patch })).toBe(false);
  });

  it('accepts only the adapter compatibility binding view, independent of object key order', () => {
    expect(
      isBwfSecretOnlyDraft({
        ...bwfSecretDraftVersion(),
        resources: { bindings: [{ type: 'secret_text', name: 'TOKEN' }] },
      }),
    ).toBe(true);
  });
});
