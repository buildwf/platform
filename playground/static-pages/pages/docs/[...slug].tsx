import type { Props } from './[...slug].server.ts';

export default function DocPage({ slug }: Props) {
  return (
    <div>
      <h1 data-testid="doc-title">{`Doc ${slug}`}</h1>
    </div>
  );
}
