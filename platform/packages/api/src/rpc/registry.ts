import { defineRegistry } from '@eeao/core';
import * as credentials from './procedures/credentials.ts';
import * as deploy from './procedures/deploy.ts';
import * as deployments from './procedures/deployments.ts';
import * as me from './procedures/me.ts';
import * as projects from './procedures/projects.ts';
import * as secrets from './procedures/secrets.ts';
import * as usage from './procedures/usage.ts';

/** Every platform procedure. The API Worker serves it at `/rpc`; clients import only its type. */
export const registry = defineRegistry([
  me.get,
  projects.create,
  projects.list,
  projects.choices,
  projects.resolve,
  projects.get,
  projects.resources,
  deploy.preflight,
  deploy.uploadUrls,
  deploy.workerUploadUrls,
  deployments.list,
  deployments.events,
  secrets.list,
  credentials.set,
  credentials.list,
  credentials.remove,
  usage.account,
  usage.project,
]);

export type PlatformRegistry = typeof registry;
