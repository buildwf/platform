import type { PluginOption } from 'vite';
import { describe, expect, it } from 'vite-plus/test';
import {
  devTriggerSecretGuardPlugin,
  isDevTriggerSecretRequest,
  isVitestServer,
} from '../../src/plugin-dev-config.ts';

describe('isDevTriggerSecretRequest', () => {
  it.each([
    '/.nosam/dev-trigger-token',
    '/.NOSAM/Dev-Trigger-Token',
    '/.nosam/./dev-trigger-token',
    '/.nosam//dev-trigger-token',
    '/.nosam/x/../dev-trigger-token',
    '/%2enosam/dev-trigger-token',
    '/%252enosam/dev-trigger-token',
    '/.nosam%2fdev-trigger-token',
    '/.nosam%5cdev-trigger-token',
    '/.nosam./dev-trigger-token',
    '/.nosam/dev-trigger-token.',
    '/.nosam/dev-trigger-token?raw',
    '/.nosam/dev-trigger-token%',
    '/@fs/Users/me/app/.nosam/dev-trigger-token',
    '/.nosam/dev-triggers.ts?import',
    '/@id/.nosam/dev-triggers.ts',
    '\\.nosam\\dev-trigger-token',
    '/.nosam/drizzle.config.json',
    '/.NOSAM/Drizzle.Config.json',
    '/%2enosam/drizzle.config.json',
    '/@fs/Users/me/app/.nosam/drizzle.config.json',
    '/.nosam/drizzle.config.json?raw',
  ])('refuses %s', (url) => {
    expect(isDevTriggerSecretRequest(url)).toBe(true);
  });

  it.each([
    undefined,
    '',
    '/',
    '/src/main.ts',
    '/.nosam/entry.ts',
    '/.nosam/routes.d.ts',
    '/__nosam/inbox?token=abc',
    '/__nosam/scheduled',
    '/api/__nosam/cron-trigger',
    '/nosam/dev-trigger-token',
    '/.voidx/dev-trigger-token',
    '/drizzle.config.json',
    '/.nosam/drizzle.config.ts',
    '/?q=/.nosam/dev-trigger-token',
    '/@vite/client',
  ])('allows %s', (url) => {
    expect(isDevTriggerSecretRequest(url)).toBe(false);
  });
});

describe('devTriggerSecretGuardPlugin', () => {
  it('runs before other dev server plugins', () => {
    expect(devTriggerSecretGuardPlugin().enforce).toBe('pre');
  });
});

describe('isVitestServer', () => {
  it.each<[Array<PluginOption>]>([
    // Vitest 5 names every plugin of its server `vitest:*`.
    [[{ name: 'vite-plugin-cloudflare' }, { name: 'vitest:config' }]],
    // Vitest 3 and 4 also name their main plugin `vitest`.
    [[{ name: 'vitest' }]],
    // Vite flattens nested arrays and ignores falsy entries.
    [[false, null, [[{ name: 'vitest:test-config' }]]]],
  ])('finds Vitest in %j', (plugins) => {
    expect(isVitestServer({ plugins })).toBe(true);
  });

  it.each<[Array<PluginOption> | undefined]>([
    [undefined],
    [[]],
    [[false, [{ name: 'vite-plugin-cloudflare' }, { name: 'nosam:env' }]]],
    // A plugin named after Vitest is not Vitest's own.
    [[{ name: 'vitest-plugin-example' }]],
  ])('does not find Vitest in %j', (plugins) => {
    expect(isVitestServer({ plugins })).toBe(false);
  });
});
