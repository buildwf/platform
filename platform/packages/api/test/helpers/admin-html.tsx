/** @jsxImportSource react */

import { Suspense } from 'react';
import { prerender } from 'react-dom/static';
import { adminComponents, adminLayoutTree } from '../../src/admin/react/pages.ts';
import { PageView, SpaContext, type PageObject } from '../../src/admin/react/spa.tsx';

/**
 * Reads a response and, for an admin SPA shell, appends the markup the browser renders from the
 * embedded page object, so tests can keep asserting on what the admin sees.
 */
export async function adminHtml(response: Response): Promise<string> {
  const html = await response.text();
  const match = html.match(
    /<script type="application\/json" id="nosam-admin-page">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    return html;
  }
  const page = JSON.parse(match[1]!) as PageObject;
  const { prelude } = await prerender(
    <SpaContext value={{ page, pending: null, visit: async () => {} }}>
      <Suspense>
        <PageView components={adminComponents} layoutTree={adminLayoutTree} page={page} />
      </Suspense>
    </SpaContext>,
  );
  // `<div id="app">` marks where the rendered page starts, as the old server-rendered shell did.
  return `${html}<div id="app">${await new Response(prelude).text()}</div>`;
}
