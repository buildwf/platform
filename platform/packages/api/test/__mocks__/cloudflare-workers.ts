// Decision: Stub for cloudflare:workers, which exists only in the Workers runtime. The vitest alias uses it so
// modules that import DurableObject load in tests.
export class DurableObject {}

// Decision: @cloudflare/containers' Container extends DurableObject and ContainerProxy extends
// WorkerEntrypoint, both from cloudflare:workers. BuildManager extends Container and is re-exported
// by src/index.ts, so each integration test that imports index.ts loads this stub. It has to provide
// both base classes, or `extends undefined` throws.
export class WorkerEntrypoint {}

export class RpcTarget {}
