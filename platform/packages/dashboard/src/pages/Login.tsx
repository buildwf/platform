import { browserPageLogo, browserPageStyles } from '@buildwf/platform/browser-page';
import type { Props } from '../../server/login.ts';

export default function LoginPage({ methods, platformName, unavailable, devLoginUrl }: Props) {
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
          <div className="nosam-auth-lead">
            <h1 id="nosam-auth-title">Sign in to {platformName}</h1>
            <p>Access your projects and deployments.</p>
          </div>
          <div className="nosam-auth-actions">
            {methods.map((method, index) => (
              <a
                key={method.id}
                className={
                  index === 0 ? 'nosam-auth-button nosam-auth-button-primary' : 'nosam-auth-button'
                }
                href={method.url}
              >
                Continue with {method.label}
              </a>
            ))}
          </div>
          {(unavailable || methods.length === 0) && (
            <div className="nosam-auth-actions">
              <p>
                Login is temporarily unavailable. Try again shortly or contact your platform
                administrator.
              </p>
              <a className="nosam-auth-button nosam-auth-button-primary" href="/login">
                Try again
              </a>
            </div>
          )}
          {devLoginUrl && (
            <div className="nosam-auth-actions">
              <a className="nosam-auth-button" href={devLoginUrl}>
                Dev login (local API)
              </a>
              <p className="nosam-auth-note">
                Local-development bypass. Requires <code>DEV_AUTH_BYPASS=true</code> on the API.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
