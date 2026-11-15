export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <nav style={{ marginBottom: '1rem' }}>
        <a href="/">Home</a> | <a href="/hello">Hello (Markdown)</a>
      </nav>
      <hr />
      {children}
    </div>
  );
}
