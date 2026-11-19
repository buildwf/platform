/** @jsxImportSource react */

import { AuthPage } from './AuthPage.tsx';

export function LoginErrorPage({
  message,
  details = [],
  platformName,
}: {
  message: string;
  details?: ReadonlyArray<string>;
  platformName: string;
}) {
  return (
    <AuthPage platformName={platformName}>
      <div className="platform-auth-status platform-auth-status-error" aria-label="Error">
        !
      </div>
      <div className="platform-auth-lead">
        <h1 id="platform-auth-title">Login failed</h1>
        <p>{message}</p>
      </div>
      {details.map((detail) => (
        <p key={detail} className="platform-auth-note">
          {detail}
        </p>
      ))}
      <a className="platform-auth-button platform-auth-button-primary" href="/admin/logout">
        Start a new sign-in
      </a>
    </AuthPage>
  );
}
