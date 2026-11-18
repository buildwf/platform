import { defineHandler } from '@buildwf/bwf';

export const GET = defineHandler((c) =>
  Object.entries(c.env)
    .filter(([name]) => !name.startsWith('__'))
    .map(([name, value]) => ({
      name,
      type:
        value === null || value === undefined
          ? 'null'
          : typeof value === 'object'
            ? Object.getPrototypeOf(value)?.constructor?.name || 'object'
            : typeof value,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);
