import { defineHandler } from '@buildwf/bwf';
import { kv } from '@buildwf/bwf/kv';

export const GET = defineHandler(async () => ({
  lastHeartbeat: await kv.get('cron:last-heartbeat'),
}));
