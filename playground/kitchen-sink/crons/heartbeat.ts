import { defineScheduled } from '@builtbyfriends/bwf';

export const cron = '* * * * *';

export default defineScheduled(async (controller, env) => {
  await env.KV.put('cron:last-heartbeat', new Date(controller.scheduledTime).toISOString());
});
