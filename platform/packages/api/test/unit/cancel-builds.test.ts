import { describe, expect, it } from 'vite-plus/test';
import type { ApiEnv } from '../../src/env.ts';
import { cancelContainerBuildDos } from '../../src/github/cancel-builds.ts';

function recordingNamespace(): {
  ns: DurableObjectNamespace;
  cancels: Array<{ id: string; reason: string }>;
} {
  const cancels: Array<{ id: string; reason: string }> = [];
  const ns = {
    idFromName: (name: string) => ({ toString: () => name }),
    get: (idObj: { toString: () => string }) => ({
      cancelBuild: async (reason: string) => {
        cancels.push({ id: idObj.toString(), reason });
      },
    }),
  } as unknown as DurableObjectNamespace;
  return { ns, cancels };
}

describe('cancelContainerBuildDos', () => {
  it('routes a standard-4 (paid) build to BUILD_MANAGER_LARGE and a free/null build to BUILD_MANAGER', async () => {
    const base = recordingNamespace();
    const large = recordingNamespace();
    const env = {
      BUILD_MANAGER: base.ns,
      BUILD_MANAGER_LARGE: large.ns,
    } as unknown as ApiEnv['Bindings'];

    await cancelContainerBuildDos(
      env,
      [
        { id: 'bld_paid', executor: 'container', instance_type: 'standard-4' },
        { id: 'bld_free', executor: 'container', instance_type: null },
      ],
      'test cancel',
    );

    expect(large.cancels).toEqual([{ id: 'bld_paid', reason: 'test cancel' }]);
    expect(base.cancels).toEqual([{ id: 'bld_free', reason: 'test cancel' }]);
  });

  it('routes the explicit free instance (standard-3) to BUILD_MANAGER', async () => {
    const base = recordingNamespace();
    const large = recordingNamespace();
    const env = {
      BUILD_MANAGER: base.ns,
      BUILD_MANAGER_LARGE: large.ns,
    } as unknown as ApiEnv['Bindings'];

    await cancelContainerBuildDos(env, [
      { id: 'bld_free', executor: 'container', instance_type: 'standard-3' },
    ]);

    expect(base.cancels).toEqual([{ id: 'bld_free', reason: 'build cancelled' }]);
    expect(large.cancels).toEqual([]);
  });

  it('skips non-container builds (github_actions have no DO)', async () => {
    const base = recordingNamespace();
    const large = recordingNamespace();
    const env = {
      BUILD_MANAGER: base.ns,
      BUILD_MANAGER_LARGE: large.ns,
    } as unknown as ApiEnv['Bindings'];

    await cancelContainerBuildDos(env, [
      { id: 'bld_actions', executor: 'github_actions', instance_type: 'standard-4' },
    ]);

    expect(base.cancels).toEqual([]);
    expect(large.cancels).toEqual([]);
  });

  it('swallows a per-build cancel failure and keeps going (best-effort, never throws)', async () => {
    const throwingBase = {
      idFromName: (name: string) => ({ toString: () => name }),
      get: () => ({
        cancelBuild: async () => {
          throw new Error('DO unreachable');
        },
      }),
    } as unknown as DurableObjectNamespace;
    const large = recordingNamespace();
    const env = {
      BUILD_MANAGER: throwingBase,
      BUILD_MANAGER_LARGE: large.ns,
    } as unknown as ApiEnv['Bindings'];

    await expect(
      cancelContainerBuildDos(env, [
        { id: 'bld_free', executor: 'container', instance_type: null },
        { id: 'bld_paid', executor: 'container', instance_type: 'standard-4' },
      ]),
    ).resolves.toBeUndefined();

    expect(large.cancels).toEqual([{ id: 'bld_paid', reason: 'build cancelled' }]);
  });
});
