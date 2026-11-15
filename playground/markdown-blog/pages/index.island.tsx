import pages from '@void/md/pages';

const posts = pages.filter((p) => p.path.startsWith('/posts'));

export default function BlogIndex() {
  return (
    <div>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.path} style={{ marginBottom: '0.75em' }}>
            <a href={post.path}>{post.title}</a>
            {typeof post.frontmatter.description === 'string' && post.frontmatter.description && (
              <p style={{ margin: '0.25em 0 0', color: '#666' }}>{post.frontmatter.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
