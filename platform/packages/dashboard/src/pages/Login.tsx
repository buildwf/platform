import { browserPageLogo, browserPageStyles } from '@builtbyfriends/platform/browser-page';
import type { Props } from '../../server/login.ts';

export default function LoginPage({ methods, platformName, unavailable, devLoginUrl }: Props) {
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
          <div className="platform-auth-lead">
            <h1 id="platform-auth-title">Sign in to {platformName}</h1>
            <p>Access your projects and deployments.</p>
          </div>
          <div className="platform-auth-actions">
            {methods.map((method, index) => (
              <a
                key={method.id}
                className={
                  index === 0 ? 'platform-auth-button platform-auth-button-primary' : 'platform-auth-button'
                }
                href={method.url}
              >
                Continue with {method.label}
              </a>
            ))}
          </div>
          {(unavailable || methods.length === 0) && (
            <div className="platform-auth-actions">
              <p>
                Login is temporarily unavailable. Try again shortly or contact your platform
                administrator.
              </p>
              <a className="platform-auth-button platform-auth-button-primary" href="/login">
                Try again
              </a>
            </div>
          )}
          {devLoginUrl && (
            <div className="platform-auth-actions">
              <a className="platform-auth-button" href={devLoginUrl}>
                Dev login (local API)
              </a>
              <p className="platform-auth-note">
                Local-development bypass. Requires <code>DEV_AUTH_BYPASS=true</code> on the API.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
