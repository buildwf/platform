import { defineHandler } from 'void';
import { kv } from 'void/kv';

export const GET = defineHandler(async (c) => {
  const lookupKey = c.req.query('lookup');
  const list = await kv.list({ limit: 20 });
  return {
    keys: list.keys.map((k) => ({ name: k.name, expiration: k.expiration ?? null })),
    lookedUp: lookupKey ? { key: lookupKey, value: await kv.get(lookupKey) } : null,
  };
});

export const POST = defineHandler(async (c) => {
  const body = await c.req.json<{ intent: 'set' | 'delete'; key: string; value?: string }>();
  if (body.intent === 'set') {
    await kv.put(body.key, body.value ?? '');
  } else {
    await kv.delete(body.key);
  }
  return { ok: true };
});
