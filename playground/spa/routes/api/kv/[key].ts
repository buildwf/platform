import { defineHandler } from '@builtbyfriends/bwf';
import * as v from 'valibot';

export const PUT = defineHandler.withValidator({
  params: v.object({ key: v.string() }),
})(async (c, { params }) => {
  await c.env.KV.put(`e2e:${params.key}`, await c.req.text());
  return { ok: true };
});

export const GET = defineHandler.withValidator({
  params: v.object({ key: v.string() }),
})(async (c, { params }) => {
  const value = await c.env.KV.get(`e2e:${params.key}`);
  if (value === null) {
    return new Response('Not found', { status: 404 });
  }
  return c.text(value);
});
