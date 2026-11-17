import { defineHandler } from 'nosam';
import { sendEmail, type SendEmailOptions } from 'nosam/email';
import { env } from 'nosam/env';
import { kv } from 'nosam/kv';

export const POST = defineHandler(async (c) => {
  const secret = env.SECRET_KEY;
  if (typeof secret !== 'string' || !secret || c.req.header('x-nosam-e2e-token') !== secret) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const body = await c.req.json<SendEmailOptions>();
  return c.json(await sendEmail(body));
});

export const GET = defineHandler(async (c) => {
  const secret = env.SECRET_KEY;
  if (typeof secret !== 'string' || !secret || c.req.header('x-nosam-e2e-token') !== secret) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const subject = c.req.query('subject');
  if (!subject || subject.length > 180) {
    return c.json({ error: 'subject must contain 1–180 characters' }, 400);
  }
  return c.json(await kv.get(`email-e2e:${subject}`));
});
