import { useForm } from '@void/react';
import type { Props } from './revalidate.server.ts';

export default function RevalidatePage({ renderedAt, lastRevalidation }: Props) {
  const form = useForm('/revalidate', {});

  return (
    <div>
      <h1>Revalidate</h1>
      <p>
        ISR revalidation via <code>void/isr</code>.
      </p>

      <h2>Page State</h2>
      <p>
        Rendered at: <code>{renderedAt}</code>
      </p>
      <p>
        Last revalidation: {lastRevalidation ? <code>{lastRevalidation}</code> : <em>never</em>}
      </p>

      <h2>Trigger Revalidation</h2>
      <p>
        Click the button to revalidate this page. The "rendered at" timestamp should update on next
        load.
      </p>
      <form action={form.post}>
        <button type="submit" disabled={form.pending}>
          {form.pending ? 'Revalidating...' : 'Revalidate /revalidate'}
        </button>
      </form>
      {form.error && (
        <p role="alert" style={{ color: 'red' }}>
          {form.error.message}
        </p>
      )}
    </div>
  );
}
