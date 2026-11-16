// Every line below is a mistake. scripts/type-errors.mjs compiles this file and compares
// the compiler's messages to messages.expected.txt, because these messages are what an
// AI agent reads to fix its own code. Run `npm run test:types -- --update` to accept changes.
import { z } from 'zod';
import { bearerAuth, defineRegistry, procedure } from '@eeao/core';

const token = bearerAuth({ verify: () => ({ id: 'u1' }) });

// 1. handler before every concern is decided
export const incomplete = procedure('contacts.list')
  .noAuth({ reason: 'Public directory with no user data' })
  .input(z.object({ q: z.string() }))
  .output(z.object({ ids: z.array(z.string()) }))
  .noMcp({ reason: 'Agents use the search tool instead' })
  .handler(async () => ({ ids: [] }));

// 2. placeholder opt-out reason
procedure('a').noAuth({ reason: 'n/a' });

// 3. authz before authentication is decided
procedure('b').authz({ policy: 'admin', check: () => true });

// 4. auth decided twice
procedure('c').noAuth({ reason: 'Public directory with no user data' }).auth(token);

// 5. an undeclared error code
procedure('d').noAuth({ reason: 'Public directory with no user data' }).noAuthz({ reason: 'Anyone may read the directory' })
  .noInput().output(z.object({})).errors({ BUSY: { status: 503, message: 'Busy' } })
  .noAnalytics({ reason: 'Not worth tracking at this volume' }).noMcp({ reason: 'Agents use the search tool instead' })
  .noCli({ reason: 'Not useful from a terminal' }).noAiTool({ reason: 'Agents use the search tool instead' })
  .handler(({ fail }) => fail('NOPE'));

// 6. mcp without an effect
procedure('e').mcp({ description: 'Delete everything' });

// 7. an unfinished builder in the registry
defineRegistry([procedure('f').noInput()]);
