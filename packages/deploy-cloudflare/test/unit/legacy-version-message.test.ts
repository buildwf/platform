import { describe, expect, it } from 'vite-plus/test';
import { isSecretDraftMessage } from '../../src/secret-draft.ts';
import { parseCloudflareVersionMessage } from '../../src/version.ts';

// Decision: Worker versions that an earlier release deployed carry `void:` messages. An upgrade reads
// them as its own record, so it doesn't see an active version without one.
describe('Worker version messages from an earlier release', () => {
  it('reads the record that the old prefix wrote', () => {
    const metadata = { schema: 1, migrations: ['v1'] };
    expect(parseCloudflareVersionMessage(`void:${JSON.stringify(metadata)}`)).toEqual(metadata);
    expect(parseCloudflareVersionMessage(`platform:${JSON.stringify(metadata)}`)).toEqual(metadata);
    expect(parseCloudflareVersionMessage('other:{}')).toBeNull();
  });

  it('knows the old secret placeholder message', () => {
    expect(isSecretDraftMessage('void:secret-draft')).toBe(true);
    expect(isSecretDraftMessage('platform:secret-draft')).toBe(true);
    expect(isSecretDraftMessage('anything else')).toBe(false);
  });
});
