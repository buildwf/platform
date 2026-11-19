/** @jsxImportSource react */

import { Link } from '@astryxdesign/core/Link';

export function ProjectUrlLink({ url }: { url: string }) {
  return (
    <Link as="a" className="platform-admin-url" href={url} isExternalLink hasUnderline tooltip={url}>
      {url.replace(/^https:\/\//, '')}
    </Link>
  );
}
