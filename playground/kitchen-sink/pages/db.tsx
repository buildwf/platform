import { Form, useForm } from '@void/react';
import { startTransition } from 'react';
import type { Props } from './db.server.ts';

export default function DbPage({ notes }: Props) {
  const form = useForm('/db?create', {
    title: '',
    body: '',
  });

  const deleteForm = useForm('/db?delete', {
    id: 0,
  });

  function deleteNote(id: number) {
    deleteForm.setData('id', id);
    startTransition(() => deleteForm.post(new FormData()));
  }

  return (
    <div>
      <h1>DB (D1)</h1>
      <p>
        SQLite database via <code>void/db</code>.
      </p>

      <h2>Add Note</h2>
      <Form form={form}>
        <div>
          <label>Title: </label>
          <input
            value={form.data.title}
            onChange={(e) => form.setData('title', e.target.value)}
            placeholder="Note title"
            required
          />
        </div>
        <div style={{ marginTop: 5 }}>
          <label>Body: </label>
          <input
            value={form.data.body ?? ''}
            onChange={(e) => form.setData('body', e.target.value)}
            placeholder="Note body"
          />
        </div>
        <button type="submit" disabled={form.pending} style={{ marginTop: 5 }}>
          {form.pending ? 'Saving...' : 'Add Note'}
        </button>
      </Form>

      <h2>Notes ({notes.length})</h2>
      {notes.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'left' }}>Title</th>
              <th style={{ textAlign: 'left' }}>Body</th>
              <th style={{ textAlign: 'left' }}>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note.id}>
                <td>{note.id}</td>
                <td>{note.title}</td>
                <td>{note.body}</td>
                <td>{note.createdAt}</td>
                <td>
                  <button onClick={() => deleteNote(note.id)} disabled={deleteForm.pending}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          <em>No notes yet. Add one above.</em>
        </p>
      )}
    </div>
  );
}
