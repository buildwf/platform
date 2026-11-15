import { Form, useForm } from '@void/react';
import { startTransition } from 'react';
import type { Props } from './storage.server.ts';

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function StoragePage({ objects }: Props) {
  // React resets the uncontrolled file input after the form action finishes.
  const uploadForm = useForm('/storage', { file: null as File | null }, { resetOnSuccess: true });

  const deleteForm = useForm('/storage', {
    intent: 'delete',
    key: '',
  });

  function deleteObject(key: string) {
    deleteForm.setData('key', key);
    startTransition(() => deleteForm.post(new FormData()));
  }

  return (
    <div>
      <h1>Storage</h1>
      <p>
        Object storage via <code>void/storage</code>.
      </p>

      <h2>Upload File</h2>
      <Form form={uploadForm}>
        <input
          type="file"
          name="file"
          onChange={(e) => uploadForm.setData('file', e.target.files?.[0] ?? null)}
          required
        />
        <button type="submit" disabled={uploadForm.pending} style={{ marginLeft: 5 }}>
          {uploadForm.pending ? 'Uploading...' : 'Upload'}
        </button>
      </Form>

      <h2>Objects ({objects.length})</h2>
      {objects.length ? (
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Key</th>
              <th style={{ textAlign: 'left' }}>Size</th>
              <th style={{ textAlign: 'left' }}>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {objects.map((obj) => (
              <tr key={obj.key}>
                <td>
                  <code>{obj.key}</code>
                </td>
                <td>{formatSize(obj.size)}</td>
                <td>{obj.uploaded}</td>
                <td>
                  <button onClick={() => deleteObject(obj.key)} disabled={deleteForm.pending}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          <em>No objects stored.</em>
        </p>
      )}
    </div>
  );
}
