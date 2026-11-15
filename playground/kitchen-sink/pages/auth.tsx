import { useRouter } from '@void/react';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { auth } from 'void/client';
import type { Props } from './auth.server.ts';

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 16px',
    border: 'none',
    borderBottom: active ? '2px solid #333' : '2px solid transparent',
    background: 'none',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}

export default function AuthPage({ user, session }: Props) {
  const router = useRouter();
  const [response, setResponse] = useState('');
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');

  function showResponse(label: string, data: unknown) {
    setResponse(`${label}:\n${JSON.stringify(data, null, 2)}`);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const u = await auth.signUp.email({
        email: regEmail,
        password: regPassword,
        name: regName,
      });
      showResponse('signUp.email (200)', u);
      setRegEmail('');
      setRegPassword('');
      setRegName('');
      router.refresh();
    } catch (err) {
      showResponse('signUp.email (error)', err);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const u = await auth.signIn.email({
        email: loginEmail,
        password: loginPassword,
      });
      showResponse('signIn.email (200)', u);
      setLoginEmail('');
      setLoginPassword('');
      router.refresh();
    } catch (err) {
      showResponse('signIn.email (error)', err);
    }
  }

  async function handleLogout() {
    await auth.signOut();
    setResponse('Logged out');
    router.refresh();
  }

  async function handleProfile() {
    const res = await fetch('/api/profile');
    const data = await res.json();
    showResponse(`GET /api/profile (${res.status})`, data);
  }

  return (
    <div>
      <h1>Auth</h1>
      <p>
        Authentication via <code>void/auth</code> + <code>void/client</code> with{' '}
        <code>auth.providers</code> configured in <code>void.json</code>.
      </p>
      <p>
        This playground enables <code>email</code> only by default so it works without OAuth
        secrets.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #ccc',
          marginBottom: 15,
        }}
      >
        <button onClick={() => setTab('login')} style={tabStyle(tab === 'login')}>
          Login
        </button>
        <button onClick={() => setTab('register')} style={tabStyle(tab === 'register')}>
          Register
        </button>
        <span style={{ marginLeft: 'auto', padding: '8px 0', fontSize: '0.9em' }}>
          {user ? (
            <>
              <strong>{user.name || user.email || user.id}</strong>{' '}
              <span style={{ opacity: 0.7 }}>
                ({user.emailVerified ? 'email verified' : 'email unverified'})
              </span>
              {session && <span style={{ opacity: 0.7 }}> session {session.id}</span>} &mdash;{' '}
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            'Not logged in'
          )}
        </span>
      </div>

      {tab === 'login' && (
        <section>
          <h2>Email Login</h2>
          <form onSubmit={handleLogin}>
            <div>
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                placeholder="Email"
                required
              />
            </div>
            <div style={{ marginTop: 5 }}>
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                type="password"
                placeholder="Password"
                required
              />
            </div>
            <button type="submit" style={{ marginTop: 5 }}>
              Login
            </button>
          </form>
        </section>
      )}

      {tab === 'register' && (
        <section>
          <h2>Email Register</h2>
          <form onSubmit={handleRegister}>
            <div>
              <input
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                type="email"
                placeholder="Email"
                required
              />
            </div>
            <div style={{ marginTop: 5 }}>
              <input
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                type="password"
                placeholder="Password"
                required
              />
            </div>
            <div style={{ marginTop: 5 }}>
              <input
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                type="text"
                placeholder="Name"
                required
              />
            </div>
            <button type="submit" style={{ marginTop: 5 }}>
              Register
            </button>
          </form>
        </section>
      )}

      <hr />

      <section>
        <h2>Protected Route</h2>
        <button onClick={handleProfile}>GET /api/profile</button>
        <p>
          Tests <code>requireAuth()</code> — returns 401 if not logged in.
        </p>
      </section>

      <section>
        <h2>Adding OAuth Providers</h2>
        <p>
          Add providers to <code>void.json</code>, for example{' '}
          <code>["email", "github", "google"]</code>.
        </p>
        <p>
          Then set <code>AUTH_GITHUB_CLIENT_ID</code> / <code>AUTH_GITHUB_CLIENT_SECRET</code> or
          the matching <code>AUTH_&lt;PROVIDER&gt;_CLIENT_ID</code> /{' '}
          <code>AUTH_&lt;PROVIDER&gt;_CLIENT_SECRET</code> env vars.
        </p>
      </section>

      {response && (
        <section>
          <h2>Response</h2>
          <pre
            style={{ background: '#f5f5f5', padding: 10, overflow: 'auto', whiteSpace: 'pre-wrap' }}
          >
            {response}
          </pre>
        </section>
      )}
    </div>
  );
}
