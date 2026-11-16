import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const guards = ['require-auth', 'return-redirect', 'throw-redirect', 'auth-redirect'];

function App() {
  const [result, setResult] = useState('');

  async function show(response: Response) {
    setResult(
      `HTTP ${response.status} ${response.headers.get('content-type') ?? ''}\n${await response.text()}`,
    );
  }

  return (
    <main>
      <h1>Server Auth Errors Example</h1>
      <p>
        Middleware in <code>middleware/auth.ts</code> guards each path below. Open them signed out
        and signed in to compare a plain <code>401</code> with redirects to <code>/login</code>.
      </p>
      <ul>
        {guards.map((guard) => (
          <li key={guard}>
            <a href={`/middleware/${guard}`}>{guard}</a>
          </li>
        ))}
      </ul>
      <button onClick={() => fetch('/api/demo-login', { method: 'POST' }).then(show)}>
        Sign in as the demo user
      </button>{' '}
      <button onClick={() => fetch('/api/profile').then(show)}>Fetch API response</button>
      <pre role="status">{result}</pre>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
