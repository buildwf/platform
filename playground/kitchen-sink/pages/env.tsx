import type { Props } from './env.server.ts';

export default function EnvPage({ bindings }: Props) {
  return (
    <div>
      <h1>Env</h1>
      <p>
        Environment bindings available via <code>c.env</code> in handlers.
      </p>

      <h2>Bindings ({bindings.length})</h2>
      {bindings.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'left' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((b) => (
              <tr key={b.name}>
                <td>
                  <code>{b.name}</code>
                </td>
                <td>{b.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          <em>No bindings found.</em>
        </p>
      )}
    </div>
  );
}
