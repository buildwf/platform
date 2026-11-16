import type { ErrorsOf, InputOf, OutputOf } from '@eeao/core';
import { createClient, RpcError } from '@eeao/http/client';

export { RpcError };

/**
 * Every procedure in `procedures/`, by name. The generated `.void/procedures.d.ts` fills this
 * in, so `rpc.contacts.get(...)` is typed from the procedure itself and no server code
 * reaches the browser.
 */
export interface ProcedureMap {}

/**
 * The procedures a module exports, named from its file: `procedures/billing/invoices.ts`
 * exporting `list` is `billing.invoices.list`, and a default export takes the file's name.
 * Generated code uses this; apps don't.
 */
export type ModuleProcedures<Module, Prefix extends string> = {
  [
    Key in keyof Module & string as Module[Key] extends { '~eeao': 'procedure' }
      ? Key extends 'default'
        ? Prefix
        : Prefix extends ''
          ? Key
          : `${Prefix}.${Key}`
      : never
  ]: Module[Key];
};

/** One procedure as a function: pass its input, get its output, or a thrown `RpcError`. */
export type RpcCall<Procedure> =
  undefined extends InputOf<Procedure>
    ? (input?: InputOf<Procedure>) => Promise<OutputOf<Procedure>>
    : (input: InputOf<Procedure>) => Promise<OutputOf<Procedure>>;

/** The error codes a procedure declares, for narrowing a caught `RpcError`. */
export type RpcErrorCode<Procedure> = ErrorsOf<Procedure>;

type Nest<Name extends string, Leaf> = Name extends `${infer Head}.${infer Rest}`
  ? { [Key in Head]: Nest<Rest, Leaf> }
  : { [Key in Name]: Leaf };

type Intersect<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
  value: infer All,
) => void
  ? All
  : never;

/** `rpc.contacts.get`, `rpc.billing.invoices.list`: the procedure names as nested calls. */
export type RpcClient<Procedures = ProcedureMap> = [keyof Procedures] extends [never]
  ? Record<string, unknown>
  : Intersect<
      {
        [Name in keyof Procedures & string]: Nest<Name, RpcCall<Procedures[Name]>>;
      }[keyof Procedures & string]
    >;

export type RpcOptions = {
  /** Where the app is served from. Leave out in the browser to call the same origin. */
  baseUrl?: string;
  /** Sent as `Authorization: Bearer ...`, for the CLI, agents and scripts. */
  token?: string | (() => string | undefined);
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

const NAME = Symbol.for('void.rpc.name');

/** The procedure name a call from `rpc` stands for, or undefined for anything else. */
export function rpcName(call: unknown): string | undefined {
  return (call as { [NAME]?: string } | null)?.[NAME];
}

/** A client for another origin or runtime. Browsers can use the ready-made `rpc`. */
export function createRpc(options: RpcOptions = {}): RpcClient {
  const client = createClient<never>(options.baseUrl ?? '', options);
  const call = client.call as unknown as (name: string, input?: unknown) => Promise<unknown>;
  const proxy = (path: Array<string>): unknown =>
    new Proxy(() => {}, {
      get: (_target, key) =>
        key === NAME ? path.join('.') : typeof key === 'string' ? proxy([...path, key]) : undefined,
      apply: (_target, _this, args) => call(path.join('.'), args[0]),
    });
  return proxy([]) as RpcClient;
}

/** Calls the app's procedures over `POST /rpc/<name>` on the page's own origin. */
export const rpc: RpcClient = createRpc();
