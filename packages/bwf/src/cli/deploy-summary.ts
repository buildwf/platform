import { intro } from '@voidzero-dev/vite-plus-prompts';
import { formatCount, pc, printSuccess, sanitizeTerminalText } from './output.ts';

export function printDeployContext(project: string, destination: string): void {
  intro(
    `${pc.dim(sanitizeTerminalText(project))} ${pc.dim('→')} ${pc.blue(sanitizeTerminalText(destination))}`,
  );
}

export function printDeploySuccess(published = true): void {
  if (published) {
    printSuccess('Successfully deployed!');
  }
}

/** Only include counts confirmed by the deployment target. */
export function formatDeploySummary(details: {
  workerName?: string;
  workers?: number;
  assets?: number;
  unchangedAssets?: number;
  typeLabel?: string;
  migrations?: number;
  d1MigrationsCurrent?: boolean;
  cronJobs?: number;
  queues?: number;
}): string {
  const lines: Array<string> = [];
  if (details.workerName) {
    lines.push(`Worker: ${details.workerName}`);
  }

  const output: Array<string> = [];
  if (details.workers !== undefined) {
    output.push(formatCount(details.workers, 'worker module'));
  }
  if (details.assets !== undefined) {
    let assets = formatCount(details.assets, 'static asset');
    if (details.unchangedAssets) {
      assets += ` (${details.unchangedAssets} unchanged, ${details.assets - details.unchangedAssets} uploaded)`;
    }
    output.push(assets);
  }
  if (details.typeLabel) {
    lines.push([details.typeLabel, output.join(', ')].filter(Boolean).join(' — '));
  } else if (output.length) {
    lines.push(output.join(', '));
  }

  if (details.migrations) {
    lines.push(`${formatCount(details.migrations, 'migration')} applied`);
  }
  if (details.d1MigrationsCurrent) {
    lines.push('D1 migrations up to date');
  }
  if (details.cronJobs) {
    lines.push(`${formatCount(details.cronJobs, 'cron job')} scheduled`);
  }
  if (details.queues) {
    lines.push(`${formatCount(details.queues, 'queue')} configured`);
  }
  return lines.join('\n');
}
