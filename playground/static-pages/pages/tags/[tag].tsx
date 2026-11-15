import type { Props } from './[tag].server.ts';

export default function TagPage({ tag }: Props) {
  return (
    <div>
      <h1 data-testid="tag-title">{`Tag ${tag}`}</h1>
    </div>
  );
}
