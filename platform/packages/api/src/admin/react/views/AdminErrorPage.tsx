/** @jsxImportSource react */

import { Link } from '../spa.tsx';
import { AuthPage } from './AuthPage.tsx';
export function AdminErrorPage({
  message,
  status,
  platformName,
}: {
  message: string;
  status: number;
  platformName: string;
}) {
  return (
    <AuthPage platformName={platformName}>
      <div className="nosam-auth-status nosam-auth-status-error" aria-label="Error">
        !
      </div>
      <div className="nosam-auth-lead">
        <h1 id="nosam-auth-title">{status === 401 ? 'Sign in again' : 'Unable to continue'}</h1>
        <p>{message}</p>
      </div>
      <Link
        reloadDocument={status === 401}
        className="nosam-auth-button nosam-auth-button-primary"
        href={status === 401 ? '/admin/logout' : '/admin/'}
      >
        {status === 401 ? 'Sign in again' : 'Refresh dashboard'}
      </Link>
    </AuthPage>
  );
}
