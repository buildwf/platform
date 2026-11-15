import { Link, useShared } from '@void/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const shared = useShared();
  return (
    <div style={{ fontFamily: 'monospace', maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <nav style={{ paddingBottom: 10, marginBottom: 20, borderBottom: '1px solid #ccc' }}>
        <strong>{shared.appName}</strong> &mdash; <Link href="/">Home</Link> |{' '}
        <Link href="/db">DB</Link> | <Link href="/kv">KV</Link> |{' '}
        <Link href="/storage">Storage</Link> | <Link href="/ai">AI</Link> |{' '}
        <Link href="/sandbox">Sandbox</Link> | <Link href="/cron">Cron</Link> |{' '}
        <Link href="/queues">Queues</Link> | <Link href="/env">Env</Link> |{' '}
        <Link href="/revalidate">Revalidate</Link> | <Link href="/auth">Auth</Link>
      </nav>
      {children}
    </div>
  );
}
