import { defineRegistry } from '@eeao/core';
import * as me from './procedures/me.ts';
import * as projects from './procedures/projects.ts';
import * as usage from './procedures/usage.ts';

/** Every platform procedure. The API Worker serves it at `/rpc`; clients import only its type. */
export const registry = defineRegistry([me.get, projects.create, usage.account, usage.project]);

export type PlatformRegistry = typeof registry;
