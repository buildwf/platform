import type { Props } from './index.server.ts';

export default function HomePage({ title }: Props) {
  return (
    <div>
      <h1 data-testid="home-title">{title}</h1>
      <p>This is the static pages playground.</p>
    </div>
  );
}
