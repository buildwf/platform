import type { Props } from './[slug].server.ts';

export default function PostPage({ slug }: Props) {
  return (
    <div>
      <h1 data-testid="post-title">{`Post ${slug}`}</h1>
    </div>
  );
}
