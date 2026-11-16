import { createProcedures, type AuthProvider } from '@eeao/core';
import type { Db } from '../db.ts';
import type { ApiEnv } from '../env.ts';
import type { User } from '../types.ts';

/** Who is calling and the connection their request already opened. */
export type Caller = { user: User; db: Db };

const callers = new WeakMap<Request, Caller>();

/** Called by the `/rpc` route once the platform's auth middleware has resolved the caller. */
export function rememberCaller(request: Request, caller: Caller): void {
  callers.set(request, caller);
}

const builders = createProcedures<ApiEnv['Bindings']>();
export const procedure: typeof builders.procedure = builders.procedure;
export const profile: typeof builders.profile = builders.profile;

/** The user `authMiddleware` authenticated: session, API token, deploy token or Access. */
export const signedIn: AuthProvider<Caller, ApiEnv['Bindings']> = {
  name: 'platform-auth',
  resolve: (request) => callers.get(request),
  actorId: (caller) => caller.user.id,
};

/**
 * Every platform procedure: signed in through `authMiddleware`. Analytics and agent tools
 * are not wired yet, so those two concerns are decided here once instead of per procedure.
 */
export const member = profile('member')
  .auth(signedIn)
  .noAnalytics({ reason: 'Request analytics already record every platform API call' })
  .noAiTool({ reason: 'Agents reach the platform through MCP, not the AI tool surface' });
