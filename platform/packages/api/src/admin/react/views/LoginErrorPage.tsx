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
      <div className="nosam-auth-status nosam-auth-status-error" aria-label="Error">
        !
      </div>
      <div className="nosam-auth-lead">
        <h1 id="nosam-auth-title">Login failed</h1>
        <p>{message}</p>
      </div>
      {details.map((detail) => (
        <p key={detail} className="nosam-auth-note">
          {detail}
        </p>
      ))}
      <a className="nosam-auth-button nosam-auth-button-primary" href="/admin/logout">
        Start a new sign-in
      </a>
    </AuthPage>
  );
}
