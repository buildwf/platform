import ThemeToggle from './_ThemeToggle.tsx' with { island: 'load' };
import '@void/md/theme.css';
import './_layout.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page void-md">
      <header>
        <nav>
          <span className="nav-links">
            <a href="/">Home</a> | <a href="/posts/getting-started">Getting Started</a> |{' '}
            <a href="/posts/code-examples">Code Examples</a>
          </span>
          <ThemeToggle />
        </nav>
        <hr />
      </header>
      {children}
    </div>
  );
}
