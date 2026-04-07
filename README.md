# SSE + BFF streaming demo

A Next.js demo that shows how to integrate Server-Sent Events (SSE) into a frontend, with a BFF (Backend for Frontend) layer that bridges an external HTTP streaming service to the browser.

## What it demonstrates

- How a browser consumes a real-time SSE stream using `EventSource`
- How a Next.js Route Handler acts as a BFF, translating an upstream stream into SSE
- How MSW intercepts both the upstream feed (server-side) and the SSE endpoint (browser-side) for local development and tests

## Architecture

```
Browser (EventSource)
    ↕  SSE  (text/event-stream)
Next.js Route Handler  /api/stream/market       ← BFF
    ↕  NDJSON over HTTP streaming  (text/plain)
Upstream market-stream service
```

### Upstream protocol

The external service uses **chunked NDJSON** — newline-delimited JSON delivered via HTTP chunked transfer encoding. The connection stays open and the server pushes each event as a JSON object on its own line, relying on HTTP's chunked transfer encoding to flush data to the reader without closing the connection. This is a common pattern for server-to-server streaming where SSE's browser-specific framing isn't needed.

Example upstream payload:

```
{"eventType":"price","instrument":"GBP","mid":100.42,"asOf":"2026-04-07T09:00:00.000Z"}
{"eventType":"market-status","state":"open","asOf":"2026-04-07T09:00:01.000Z"}
```

### BFF translation

`app/api/stream/http-adapter.ts` reads the NDJSON stream and yields parsed objects. `app/api/stream/market/route.ts` maps those upstream events to SSE events and pipes them to the browser via `app/api/stream/create-sse-response.ts`.

```
NDJSON line → mapEvent() → SSE frame (event: price-update\ndata: {...}\n\n)
```

## Running locally

Start the dev server with the upstream market feed mocked by MSW:

```bash
MSW=true pnpm dev
```

Without `MSW=true` the BFF will attempt to reach the real upstream URL defined by `UPSTREAM_BASE_URL`.

## Running tests

```bash
pnpm test           # run once
pnpm test:watch     # watch mode
pnpm test:coverage  # with 100% coverage enforcement
```

Tests use MSW to intercept both layers:

- **BFF tests** (`route.test.ts`, `http-adapter.test.ts`, `create-sse-response.test.ts`) — MSW intercepts `fetch` calls made by the BFF to the upstream NDJSON service
- **Browser tests** (`page.test.tsx`) — MSW intercepts `EventSource` connections to `/api/stream/market`

## Key files

| Path                                    | Purpose                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| `app/api/stream/http-adapter.ts`        | Reads NDJSON stream from upstream over HTTP                   |
| `app/api/stream/create-sse-response.ts` | Wraps an async iterable of events into an SSE `Response`      |
| `app/api/stream/market/route.ts`        | BFF route: fetches upstream, maps events, returns SSE         |
| `app/api/stream/market/map-event.ts`    | Transforms upstream NDJSON shapes to SSE event shapes         |
| `app/sse/use-market-stream.ts`          | React hook that opens an `EventSource` and manages state      |
| `app/dev-mocks/handlers.ts`             | MSW handler simulating the upstream NDJSON feed for local dev |
| `test/default-handlers.ts`              | MSW handlers for both BFF and browser layers used in tests    |
| `instrumentation.ts`                    | Starts MSW in the Node.js runtime when `MSW=true`             |
