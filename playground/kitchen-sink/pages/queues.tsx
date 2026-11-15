import { Form, useForm } from '@void/react';
import { startTransition } from 'react';
import type { Props } from './queues.server.ts';

export default function QueuesPage({ results }: Props) {
  const form = useForm('/queues', {
    key: '',
    value: '',
  });

  const deleteForm = useForm('/queues', {
    intent: 'delete',
    id: 0,
  });

  function deleteResult(id: number) {
    deleteForm.setData('id', id);
    startTransition(() => deleteForm.post(new FormData()));
  }

  return (
    <div>
      <h1>Queues</h1>
      <p>
        Message queues via <code>void/queues</code>. Messages are sent to <code>demo-queue</code>,
        consumed and written to DB.
      </p>

      <h2>Send Message</h2>
      <Form form={form}>
        <div>
          <label>Key: </label>
          <input
            value={form.data.key as string}
            onChange={(e) => form.setData('key', e.target.value)}
            placeholder="my-key"
            required
          />
        </div>
        <div style={{ marginTop: 5 }}>
          <label>Value: </label>
          <input
            value={form.data.value as string}
            onChange={(e) => form.setData('value', e.target.value)}
            placeholder="my-value"
            required
          />
        </div>
        <button type="submit" disabled={form.pending} style={{ marginTop: 5 }}>
          {form.pending ? 'Sending...' : 'Send to Queue'}
        </button>
      </Form>

      <h2>Processed Results ({results.length})</h2>
      <p>
        <em>Messages consumed from the queue are written to D1 via the consumer.</em>
      </p>
      {results.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Key</th>
              <th style={{ textAlign: 'left' }}>Value</th>
              <th style={{ textAlign: 'left' }}>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>
                  <code>{r.key}</code>
                </td>
                <td>
                  <code>{r.value}</code>
                </td>
                <td>{r.createdAt}</td>
                <td>
                  <button onClick={() => deleteResult(r.id)} disabled={deleteForm.pending}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          <em>No results yet. Send a message and wait for the consumer to process it.</em>
        </p>
      )}
    </div>
  );
}
