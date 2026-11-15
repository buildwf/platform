import type { Props } from './cron.server.ts';

export default function CronPage({ lastHeartbeat }: Props) {
  return (
    <div>
      <h1>Cron</h1>
      <p>
        Scheduled jobs via <code>defineScheduled</code>. The <code>heartbeat</code> cron runs every
        minute and writes a timestamp to KV.
      </p>

      <h2>Last Heartbeat</h2>
      {lastHeartbeat ? (
        <p>
          <code>{lastHeartbeat}</code>
        </p>
      ) : (
        <p>
          <em>No heartbeat recorded yet. The cron job runs every minute — check back shortly.</em>
        </p>
      )}

      <h2>Cron Definition</h2>
      <pre style={{ background: '#f5f5f5', padding: 10 }}>
        {`// crons/heartbeat.ts
export const cron = "* * * * *";

export default defineScheduled(async (controller, env) => {
  await env.KV.put("cron:last-heartbeat",
    new Date(controller.scheduledTime).toISOString());
});`}
      </pre>
    </div>
  );
}
