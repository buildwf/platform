import { defineHandler } from '@builtbyfriends/bwf';
import { kv } from '@builtbyfriends/bwf/kv';

export const GET = defineHandler(async () => ({
  lastHeartbeat: await kv.get('cron:last-heartbeat'),
}));
