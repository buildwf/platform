/** @jsxImportSource react */

import { browserPageLogo, browserPageStyles } from '@builtbyfriends/platform/browser-page';
import type { ReactNode } from 'react';

export function AuthPage({
  platformName,
  children,
}: {
  platformName: string;
  children: ReactNode;
}) {
  return (
    <main className="platform-auth-page">
      <style>{browserPageStyles}</style>
      <div className="platform-auth-container">
        <div className="platform-auth-brand">
          <span className="platform-auth-logo" dangerouslySetInnerHTML={{ __html: browserPageLogo }} />
          <span className="platform-auth-divider" aria-hidden="true" />
          <span>{platformName}</span>
        </div>
        <section className="platform-auth-card" aria-labelledby="platform-auth-title">
          {children}
        </section>
      </div>
    </main>
  );
}
