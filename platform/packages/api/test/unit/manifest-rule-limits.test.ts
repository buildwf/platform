import { describe, expect, it } from 'vite-plus/test';
import { MAX_ROUTING_RULES, validateManifestShape } from '../../src/routes/deploy.ts';

// Decision: Dispatch compiles a regex per routing rule on each request, so a manifest with 100k rules would
// exhaust CPU on every project request. The deploy-time validator rejects lists over
// MAX_ROUTING_RULES.
describe('manifest validation: routing rule count caps', () => {
  function manifestWith(field: 'redirectRules' | 'fallbackRules', count: number) {
    const rules: Array<{ source: string; destination: string; status: number }> = [];
    for (let i = 0; i < count; i++) {
      rules.push({ source: `/r${i}`, destination: `/d${i}`, status: 200 });
    }
    return {
      version: 3,
      bindings: {},
      [field]: rules,
    };
  }

  it('accepts a redirectRules list at exactly the limit', () => {
    expect(validateManifestShape(manifestWith('redirectRules', MAX_ROUTING_RULES))).toBeNull();
  });

  it('rejects a redirectRules list one over the limit', () => {
    const err = validateManifestShape(manifestWith('redirectRules', MAX_ROUTING_RULES + 1));
    expect(err).not.toBeNull();
    expect(err).toMatch(/redirectRules/);
    expect(err).toMatch(String(MAX_ROUTING_RULES));
  });

  it('accepts a fallbackRules list at exactly the limit', () => {
    expect(validateManifestShape(manifestWith('fallbackRules', MAX_ROUTING_RULES))).toBeNull();
  });

  it('rejects a fallbackRules list one over the limit', () => {
    const err = validateManifestShape(manifestWith('fallbackRules', MAX_ROUTING_RULES + 1));
    expect(err).not.toBeNull();
    expect(err).toMatch(/fallbackRules/);
    expect(err).toMatch(String(MAX_ROUTING_RULES));
  });
});
