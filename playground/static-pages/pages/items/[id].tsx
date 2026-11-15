import type { Props } from './[id].server.ts';

export default function ItemPage({ id }: Props) {
  return (
    <div>
      <h1>{`Item ${id}`}</h1>
    </div>
  );
}
