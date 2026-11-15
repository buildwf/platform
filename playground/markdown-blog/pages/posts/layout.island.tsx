import { useFrontmatter } from '@void/md';
import pages from '@void/md/pages';

const posts = pages.filter((p) => p.path.startsWith('/posts'));

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  const fm = useFrontmatter();
  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <aside style={{ width: 200, flexShrink: 0 }}>
        <h3>Posts</h3>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {posts.map((post) => (
              <li key={post.path} style={{ marginBottom: '0.5em' }}>
                <a href={post.path}>{post.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="void-md" style={{ flex: 1, minWidth: 0 }}>
        {typeof fm.title === 'string' && fm.title && <h1>{fm.title}</h1>}
        {children}
      </main>
    </div>
  );
}
