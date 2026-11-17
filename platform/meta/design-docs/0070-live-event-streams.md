---
title: Live Event Streams
status: implemented
---

# Live event streams

nosam/live delivers topic events from routes, scheduled jobs, and queue consumers to browser subscribers over Server-Sent Events. A generated Durable Object hub tracks connections and topic subscriptions; the browser client multiplexes several subscriptions over one EventSource and restores active subscriptions after reconnecting.

Applications define a stream, expose its connect and control handlers, and publish by topic. Authorization, replay behavior, and delivery limits are described in the [live streams guide](../../../docs/guide/live.md).

See [server runtime](../../../packages/nosam/src/runtime/live.ts), [hub implementation](../../../packages/nosam/src/runtime/live-server.ts), and [browser client](../../../packages/nosam/src/runtime/live-client.ts).
