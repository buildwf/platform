import type { GitHubInstallationRepository } from '../schema.ts';
import type { GitHubInstallation } from '../types.ts';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2026-03-10';

// Decision: The parts of the `GET /installation/repositories` response we use. The per-repo `owner` gives the
// installation's account metadata, and the top-level `repository_selection` records whether the
// install grants all repos (`all`) or only the cached set (`selected`).
type InstallationRepositoriesResponse = Readonly<{
  repository_selection?: string;
  repositories: ReadonlyArray<{
    full_name: string;
    id: number;
    owner?: { login?: string; id?: number; type?: string };
  }>;
}>;

export type InstallationRepositories = Readonly<{
  repositories: ReadonlyArray<GitHubInstallationRepository>;
  owner: { login?: string; id?: number; type?: string } | undefined;
  repositorySelection: GitHubInstallation['repository_selection'];
}>;

/**
 * List the repositories an installation can access, authenticating with the
 * installation token.
 *
 * Paginates `GET /installation/repositories` (100 per page) so `selected`
 * installs with >100 repos don't get a truncated cache. Also returns the
 * top-level `repository_selection` (`all` | `selected`) so the caller can store
 * whether the install grants every repo — the cached `repositories` array is
 * irrelevant for `all` installs.
 *
 * Shared by the connect callback (`routes/github.ts`) and the
 * `installation_repositories` webhook (`routes/webhooks.ts`), which refetches
 * the authoritative set on an `all`→`selected` narrowing rather than diffing the
 * intentionally-empty `all` cache.
 */
export async function listInstallationRepositories(
  token: string,
): Promise<InstallationRepositories> {
  const repositories: Array<GitHubInstallationRepository> = [];
  let owner: { login?: string; id?: number; type?: string } | undefined;
  let repositorySelection: GitHubInstallation['repository_selection'] = 'selected';

  for (let page = 1; ; page += 1) {
    const res = await fetch(
      `${GITHUB_API_BASE}/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'platform-api',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      throw new Error(
        `Failed to list installation repositories: ${res.status} ${body.trim() || '<empty>'}`,
      );
    }

    const data = (await res.json()) as InstallationRepositoriesResponse;
    if (page === 1) {
      // Decision: `repository_selection` belongs to the installation and is the same on each page; read it from the
      // first. Only the literal `'all'` grants all repos; anything else is the safe `'selected'` default.
      repositorySelection = data.repository_selection === 'all' ? 'all' : 'selected';
      owner = data.repositories[0]?.owner;
      // Decision: The cached `repositories` array isn't read for an `all` install: coverage checks short-circuit on
      // `repository_selection = 'all'` and the connect route resolves ids live. Stop after page 1 instead
      // of listing a large org, and return an empty `repositories` (what the webhook path stores for
      // `all`, where GitHub omits the list).
      if (repositorySelection === 'all') {
        break;
      }
    }
    for (const repo of data.repositories) {
      repositories.push({ full_name: repo.full_name, id: repo.id });
    }
    // Decision: GitHub returns up to `per_page` per page; a short page is the last one.
    if (data.repositories.length < 100) {
      break;
    }
  }

  return { repositories, owner, repositorySelection };
}
