export function discoveryDisplayName(document: { displayName?: unknown }): string {
  const name = typeof document.displayName === 'string' ? document.displayName.trim() : '';
  return name || 'Nosam Cloud';
}

export function platformPageTitle(page: string, platformName: string): string {
  return `${page} · ${platformName}${/\bnosam\b/i.test(platformName) ? '' : ' · Nosam'}`;
}
