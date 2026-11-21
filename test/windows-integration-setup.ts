import { beforeEach } from 'vite-plus/test';
import { createWindowsResourceReporter } from './windows-resource-diagnostics.ts';

// Decision: Captured at the first failed test, before teardown removes browsers and dev servers. Concurrent
// failures share one bounded snapshot per file instead of starting more processes.
const reportResources = createWindowsResourceReporter();
beforeEach(({ onTestFailed }) => {
  onTestFailed(reportResources);
});
