import type { Props } from './client-only.server.ts';

export default function ClientOnlyPage({ title, marker }: Props) {
  if (typeof window === 'undefined') {
    throw new Error('client-only static page component rendered on the server');
  }

  return (
    <main>
      <h1 data-testid="client-only-title">{title}</h1>
      <p data-testid="client-only-marker">{marker}</p>
    </main>
  );
}
