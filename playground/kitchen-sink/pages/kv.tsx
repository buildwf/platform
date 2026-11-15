import { Form, useForm } from '@void/react';
import { startTransition } from 'react';
import type { Props } from './kv.server.ts';

export default function KvPage({ keys, lookedUp }: Props) {
  const setForm = useForm('/kv', {
    intent: 'set',
    key: '',
    value: '',
  });

  const deleteForm = useForm('/kv', {
    intent: 'delete',
    key: '',
  });

  function deleteKey(name: string) {
    deleteForm.setData('key', name);
    startTransition(() => deleteForm.post(new FormData()));
  }

  return (
    <div>
      <h1>KV</h1>
      <p>
        Key-Value storage via <code>void/kv</code>.
      </p>

      <h2>Set Key</h2>
      <Form form={setForm}>
        <div>
          <label>Key: </label>
          <input
            value={setForm.data.key as string}
            onChange={(e) => setForm.setData('key', e.target.value)}
            placeholder="my-key"
            required
          />
        </div>
        <div style={{ marginTop: 5 }}>
          <label>Value: </label>
          <input
            value={setForm.data.value as string}
            onChange={(e) => setForm.setData('value', e.target.value)}
            placeholder="my-value"
            required
          />
        </div>
        <button type="submit" disabled={setForm.pending} style={{ marginTop: 5 }}>
          {setForm.pending ? 'Saving...' : 'Set'}
        </button>
      </Form>

      <h2>Lookup Key</h2>
      <form method="get" action="/kv">
        <input name="lookup" placeholder="Key to look up" required />
        <button type="submit">Get</button>
      </form>
      {lookedUp && (
        <div style={{ marginTop: 10 }}>
          <strong>{lookedUp.key}</strong> ={' '}
          {lookedUp.value !== null ? (
            <span>
              <code>{lookedUp.value}</code>
            </span>
          ) : (
            <span>
              <em>(not found)</em>
            </span>
          )}
        </div>
      )}

      <h2>Keys ({keys.length})</h2>
      {keys.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Key</th>
              <th style={{ textAlign: 'left' }}>Expiration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.name}>
                <td>
                  <code>{k.name}</code>
                </td>
                <td>{k.expiration ? new Date(k.expiration * 1000).toISOString() : '—'}</td>
                <td>
                  <button onClick={() => deleteKey(k.name)} disabled={deleteForm.pending}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          <em>No keys found.</em>
        </p>
      )}
    </div>
  );
}
