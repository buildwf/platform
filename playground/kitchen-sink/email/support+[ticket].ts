import { defineEmail, parseEmail, replyEmail } from '@builtbyfriends/bwf/email';

export default defineEmail(async (message, _env, _ctx, info) => {
  const ticket = info?.params.ticket ?? 'unknown';
  const parsed = await parseEmail(message);

  console.log(`[email] ticket=${ticket} from=${message.from} subject=${parsed.subject ?? ''}`);

  await replyEmail(message, {
    text:
      `Hi! Your message on ticket ${ticket} was received.\n\n` +
      `We logged the subject: "${parsed.subject ?? ''}"`,
  });
});
