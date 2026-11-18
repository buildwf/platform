/** @jsxImportSource react */

import { browserPageLogo, browserPageStyles } from '@buildwf/platform/browser-page';
import type { ReactNode } from 'react';

export function AuthPage({
  platformName,
  children,
}: {
  platformName: string;
  children: ReactNode;
}) {
  return (
    <main className="nosam-auth-page">
      <style>{browserPageStyles}</style>
      <div className="nosam-auth-container">
        <div className="nosam-auth-brand">
          <span className="nosam-auth-logo" dangerouslySetInnerHTML={{ __html: browserPageLogo }} />
          <span className="nosam-auth-divider" aria-hidden="true" />
          <span>{platformName}</span>
        </div>
        <section className="nosam-auth-card" aria-labelledby="nosam-auth-title">
          {children}
        </section>
      </div>
    </main>
  );
}
