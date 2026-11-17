import { describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
  client: vi.fn((options?: unknown) => ({ framework: 'client', options })),
  react: vi.fn((options?: unknown) => ({ framework: 'react', options })),
}));

vi.mock('better-auth/client', () => ({
  createAuthClient: mocks.client,
}));

vi.mock('better-auth/react', () => ({
  createAuthClient: mocks.react,
}));

describe('client runtimes', () => {
  it.each([
    ['default', 'client', () => import('../../src/runtime/client.ts')],
    ['React', 'react', () => import('../../src/runtime/client-react.ts')],
  ] as const)('re-exports the %s Better Auth client', async (_name, framework, load) => {
    const { auth, createAuthClient } = await load();
    expect(createAuthClient).toBe(mocks[framework]);
    expect(mocks[framework]).toHaveBeenCalledWith({ basePath: '/api/auth' });
    expect(auth).toEqual({ framework, options: { basePath: '/api/auth' } });
  });
});
