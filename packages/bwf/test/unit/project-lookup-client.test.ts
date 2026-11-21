import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PlatformClient } from '../../src/cli/client.ts';
import { withPlatformDiscovery } from '../helpers/platform-discovery.ts';

const fetchMock = vi.fn();
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = withPlatformDiscovery(fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function client(): PlatformClient {
  return new PlatformClient('test-token', { apiUrl: 'https://api.example.test' });
}

const project = { id: 'proj_1', slug: 'my-app', role: 'collaborator' };

describe('targeted project lookup', () => {
  it('lists interactive choices without requesting deployment and traffic summaries', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: [project] }));
    await expect(client().listProjectChoices()).resolves.toEqual([project]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.test/rpc/projects.choices',
    ]);
  });

  it('resolves a slug without loading the project list', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: { project } }));

    await expect(client().findProjectBySlug('my app')).resolves.toEqual(project);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/rpc/projects.resolve');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ slug: 'my app' });
  });

  it('returns null for a missing slug', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: { project: null } }));
    await expect(client().findProjectBySlug('missing')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(['listProjectChoices', 'findProjectBySlug'] as const)(
    'reports a 404 from %s as an API error',
    async (method) => {
      fetchMock.mockResolvedValueOnce(Response.json({ error: 'not found' }, { status: 404 }));
      const api = client();
      await expect(
        method === 'findProjectBySlug' ? api.findProjectBySlug('my-app') : api.listProjectChoices(),
      ).rejects.toMatchObject({ name: 'PlatformApiError', status: 404 });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it('loads a linked project by ID and treats a refused one (403) as unavailable', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: project }));
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: { code: 'FORBIDDEN', message: 'No access' } }, { status: 403 }),
    );

    const api = client();
    await expect(api.getProject('proj_1')).resolves.toEqual(project);
    await expect(api.getProject('missing')).resolves.toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example.test/rpc/projects.get',
      'https://api.example.test/rpc/projects.get',
    ]);
    expect(
      fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string)),
    ).toEqual([{ projectId: 'proj_1' }, { projectId: 'missing' }]);
  });
});
