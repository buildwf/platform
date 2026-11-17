import { execFileSync } from 'node:child_process';
import { expect, it } from 'vite-plus/test';

function renderLogger(color: boolean): string {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  if (color) {
    env.FORCE_COLOR = '1';
  } else {
    env.NO_COLOR = '1';
  }
  const logger = new URL('../../src/log.ts', import.meta.url).href;
  return execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { setShowTimestamp, nosamLog, nosamWarn, nosamError } from ${JSON.stringify(logger)};
       setShowTimestamp(false);
       nosamLog('Ready'); nosamWarn('Missing cache'); nosamError('Missing secret');`,
    ],
    { env, encoding: 'utf8', timeout: 10_000 },
  );
}

it('honors NO_COLOR for dev messages and severity output', () => {
  expect(renderLogger(false)).toBe('[nosam] Ready\n[nosam] Missing cache\n[nosam] Missing secret\n');
});

it('uses blue branding while keeping warnings and errors distinct', () => {
  const output = renderLogger(true);
  expect(output).toContain('\x1b[34m[nosam]');
  expect(output).toContain('\x1b[33mMissing cache');
  expect(output).toContain('\x1b[31mMissing secret');
  expect(output).not.toContain('\x1b[36m');
});
