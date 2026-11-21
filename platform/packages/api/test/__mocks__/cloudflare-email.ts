// Decision: Test stub for the `cloudflare:email` workerd built-in. The real module exists only in the Workers
// runtime, so the plain Node unit runner can't resolve it. Aliased from the root `vite.config.ts`.
export class EmailMessage {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly raw: ReadableStream | string,
  ) {}
}
