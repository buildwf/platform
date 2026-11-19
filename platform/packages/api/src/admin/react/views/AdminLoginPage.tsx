/** @jsxImportSource react */

import { AuthPage } from './AuthPage.tsx';

export function AdminLoginPage({
  providers,
  platformName,
}: {
  providers: Array<{ id: string; label: string }>;
  platformName: string;
}) {
  return (
    <AuthPage platformName={platformName}>
      <div className="platform-auth-lead">
        <h1 id="platform-auth-title">Sign in to administer {platformName}</h1>
        <p>Sign in with your administrator account.</p>
      </div>
      <div className="platform-auth-actions">
        {providers.map(({ id, label }, index) => (
          <a
            key={id}
            className={
              index === 0 ? 'platform-auth-button platform-auth-button-primary' : 'platform-auth-button'
            }
            href={`/admin/login/${encodeURIComponent(id)}`}
          >
            Sign in with {label}
          </a>
        ))}
      </div>
      {providers.length === 0 && (
        <p>No administrator login methods are available. Resume setup from the installing CLI.</p>
      )}
    </AuthPage>
  );
}
