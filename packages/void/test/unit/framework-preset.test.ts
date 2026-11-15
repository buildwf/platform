import { describe, it, expect } from 'vite-plus/test';
import { FRAMEWORK_PRESETS } from '../../src/cli/preset.ts';

describe('FRAMEWORK_PRESETS', () => {
  it.each([
    ['tanstack-start', 'dist/server'],
    ['react-router', 'build/server'],
    ['vinext-app', 'dist/server'],
    ['vinext-pages', 'dist/ssr'],
  ])('matches the generated %s Cloudflare Worker directory', (name, workerDir) => {
    const preset = FRAMEWORK_PRESETS[name];
    expect(preset.cloudflareArtifact).toBe('vite-plugin');
    expect(preset.workerDir).toBe(workerDir);
    expect(preset.workerMain).toBe('index.js');
  });
});
