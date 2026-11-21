import { defineEmail } from '@builtbyfriends/bwf/email';

export default defineEmail(async (message) => {
  console.log(`[email] unhandled to=${message.to} from=${message.from}`);
  message.setReject(`No handler for ${message.to}`);
});
