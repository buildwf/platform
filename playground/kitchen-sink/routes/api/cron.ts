import { defineHandler } from 'void';
import { kv } from 'void/kv';

export const GET = defineHandler(async () => ({
  lastHeartbeat: await kv.get('cron:last-heartbeat'),
}));
