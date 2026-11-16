import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PlatformClient } from '../../src/cli/client.ts';
import { withPlatformDiscovery } from '../helpers/platform-discovery.ts';

const fetchMock = vi.fn();
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = withPlatformDiscovery(fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

const apiUrl = 'https://api.test';
const projectId = 'proj_abc';
const token = 'test-token';

function makeClient(): PlatformClient {
  return new PlatformClient(token, { apiUrl });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('PlatformClient.getDatabaseUrl', () => {
  it('calls database.getUrl with auth headers and returns the URL', async () => {
    const expected = 'postgres://user:pass@host:5432/mydb';
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { url: expected } }));

    const result = await makeClient().getDatabaseUrl(projectId);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${apiUrl}/rpc/database.getUrl`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${token}`);
    expect(init.body).toBe(JSON.stringify({ projectId }));
    expect(result).toEqual({ url: expected });
  });
});
