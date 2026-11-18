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
const projectId = 'project_1';

function client(): PlatformClient {
  return new PlatformClient('test-token', { apiUrl });
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function request(index = 0): [string, RequestInit] {
  return fetchMock.mock.calls[index] as [string, RequestInit];
}

describe('PlatformClient project teams', () => {
  it('lists members and project invitations from response envelopes', async () => {
    const member = { user: { id: 'user_1', login: 'alex' }, role: 'admin' };
    const invitation = { id: 'invite_1', role: 'reader' };
    fetchMock.mockResolvedValueOnce(json({ data: { members: [member] } }));
    fetchMock.mockResolvedValueOnce(json({ data: { invitations: [invitation] } }));

    await expect(client().listProjectMembers(projectId)).resolves.toEqual({ members: [member] });
    await expect(client().listProjectInvitations(projectId)).resolves.toEqual([invitation]);
    expect(request(0)[0]).toBe(`${apiUrl}/rpc/team.members`);
    expect(request(1)[0]).toBe(`${apiUrl}/rpc/team.invitations`);
  });

  it('passes member list warnings through', async () => {
    const member = { user: { id: 'user_1', login: 'alex' }, role: 'owner' };
    fetchMock.mockResolvedValueOnce(json({ data: { members: [member], warnings: ['stuck'] } }));

    await expect(client().listProjectMembers(projectId)).resolves.toEqual({
      members: [member],
      warnings: ['stuck'],
    });
  });

  it('invites only by email and role', async () => {
    const result = {
      invitation: { id: 'invite_1', role: 'collaborator' },
      refreshed: false,
      delivery: { status: 'not_configured' },
    };
    fetchMock.mockResolvedValueOnce(json({ data: result }));

    await expect(
      client().inviteProjectMember(projectId, 'alex@example.com', 'collaborator'),
    ).resolves.toEqual(result);
    expect(request()[0]).toBe(`${apiUrl}/rpc/team.invite`);
    expect(request()[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ projectId, email: 'alex@example.com', role: 'collaborator' }),
    });
  });

  it('changes and removes members', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { member: { user: { id: 'user / 1' }, role: 'admin' } } }),
    );
    fetchMock.mockResolvedValueOnce(json({ data: { ok: true } }));

    await client().updateProjectMemberRole(projectId, 'user / 1', 'admin');
    await client().removeProjectMember(projectId, 'user / 1');
    expect(request(0)[0]).toBe(`${apiUrl}/rpc/team.setRole`);
    expect(request(0)[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ projectId, userId: 'user / 1', role: 'admin' }),
    });
    expect(request(1)[0]).toBe(`${apiUrl}/rpc/team.remove`);
    expect(request(1)[1]).toMatchObject({
      body: JSON.stringify({ projectId, userId: 'user / 1' }),
    });
  });

  it('revokes invitations and leaves projects', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { ok: true } }));
    fetchMock.mockResolvedValueOnce(json({ data: { ok: true } }));

    await client().revokeProjectInvitation(projectId, 'invite / 1');
    await client().leaveProject(projectId);
    expect(request(0)[0]).toBe(`${apiUrl}/rpc/team.revokeInvitation`);
    expect(request(0)[1]).toMatchObject({
      body: JSON.stringify({ projectId, invitationId: 'invite / 1' }),
    });
    expect(request(1)[0]).toBe(`${apiUrl}/rpc/team.leave`);
  });

  it('lists, accepts, and declines account-bound invitations', async () => {
    const invitation = { id: 'invite_1', project: { id: projectId, slug: 'app' }, role: 'reader' };
    fetchMock.mockResolvedValueOnce(json({ data: { invitations: [invitation] } }));
    fetchMock.mockResolvedValueOnce(
      json({ data: { member: { user: { id: 'user_1' }, role: 'reader' } } }),
    );
    fetchMock.mockResolvedValueOnce(json({ data: {} }));

    await expect(client().listPendingProjectInvitations()).resolves.toEqual([invitation]);
    await client().respondToProjectInvitation('invite / 1', 'accept');
    await client().respondToProjectInvitation('invite / 1', 'decline');
    expect(request(0)[0]).toBe(`${apiUrl}/rpc/team.myInvitations`);
    expect(request(1)[0]).toBe(`${apiUrl}/rpc/team.respond`);
    expect(request(1)[1]).toMatchObject({
      body: JSON.stringify({ invitationId: 'invite / 1', response: 'accept' }),
    });
    expect(request(2)[1]).toMatchObject({
      body: JSON.stringify({ invitationId: 'invite / 1', response: 'decline' }),
    });
  });
});
