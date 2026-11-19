---
title: Server-Sent Event Helpers
status: implemented
---

# Server-Sent Event helpers

platform/sse provides eventStream() for a request-owned SSE response. It formats events and comments, sends keepalives, validates frame fields, and closes with the request or producer. platform/sse/client provides browser consumption helpers. This is intended for streams whose producer is the request itself; cross-request topic delivery uses platform/live.

The runtime lives in [server helpers](../../../packages/bwf/src/runtime/sse.ts) and [client helpers](../../../packages/bwf/src/runtime/sse-client.ts). The [SSE guide](../../../docs/guide/sse.md) describes the public contract.
