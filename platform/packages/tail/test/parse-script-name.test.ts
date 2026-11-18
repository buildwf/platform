import { describe, it, expect } from 'vite-plus/test';
import { parseScriptName } from '../src/index.ts';

describe('parseScriptName', () => {
  it('attributes stable Durable Object Workers through platform-owned tags', () => {
    expect(
      parseScriptName('nosam-do-proj_example-hash', undefined, [
        'nosam-project:user-my-app',
        'nosam-deployment:dpl_abc123',
      ]),
    ).toEqual({ projectKey: 'user-my-app', deployId: 'dpl_abc123' });
    expect(parseScriptName('nosam-do-proj_example-hash')).toBeNull();
    expect(
      parseScriptName('nosam-do-proj_example-hash', undefined, [
        'nosam-project:__platform-dispatch',
      ]),
    ).toBeNull();
  });
  it('parses versioned script name', () => {
    expect(parseScriptName('user-myapp-dpl_abc123')).toEqual({
      projectKey: 'user-myapp',
      deployId: 'dpl_abc123',
    });
  });

  it('parses legacy script name', () => {
    expect(parseScriptName('user-myapp')).toEqual({
      projectKey: 'user-myapp',
      deployId: '',
    });
  });

  it('handles hyphenated slugs with versioned name', () => {
    expect(parseScriptName('user-my-hyphenated-app-dpl_xyz789')).toEqual({
      projectKey: 'user-my-hyphenated-app',
      deployId: 'dpl_xyz789',
    });
  });

  it('filters out non-user, non-platform scripts', () => {
    expect(parseScriptName('nosam-api')).toBeNull();
    expect(parseScriptName('nosam-tail')).toBeNull();
    expect(parseScriptName('nosam-proxy')).toBeNull();
  });

  it('accepts nosam-dispatch under __platform-dispatch project key', () => {
    expect(parseScriptName('nosam-dispatch')).toEqual({
      projectKey: '__platform-dispatch',
      deployId: '',
    });
  });

  it('accepts nosam-dispatch-staging under __platform-dispatch-staging project key', () => {
    expect(parseScriptName('nosam-dispatch-staging')).toEqual({
      projectKey: '__platform-dispatch-staging',
      deployId: '',
    });
  });

  it('accepts the configured self-hosted dispatch Worker name', () => {
    expect(parseScriptName('nosam-company-dispatch', 'nosam-company-dispatch')).toEqual({
      projectKey: '__platform-dispatch',
      deployId: '',
    });
    expect(parseScriptName('nosam-other-dispatch', 'nosam-company-dispatch')).toBeNull();
  });
});
