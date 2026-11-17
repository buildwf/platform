import { defineHandler } from 'nosam';
import { kv } from 'nosam/kv';

export const GET = defineHandler(async () => ({
  lastHeartbeat: await kv.get('cron:last-heartbeat'),
}));
