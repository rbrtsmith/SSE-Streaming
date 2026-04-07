import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { createUpstreamStream } from "@/test/utils";
import { subscribeToHttpStream } from "./http-adapter";

const UPSTREAM_URL = "http://upstream.test/stream";

test("yields parsed JSON objects for each newline-delimited line", async () => {
  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        createUpstreamStream([
          { type: "price", value: 101.25 },
          { type: "status", state: "open" },
        ]),
      );
    }),
  );

  const { events } = await subscribeToHttpStream<{ type: string }>(
    UPSTREAM_URL,
  );

  const collected: unknown[] = [];
  for await (const event of events) {
    collected.push(event);
  }

  expect(collected).toEqual([
    { type: "price", value: 101.25 },
    { type: "status", state: "open" },
  ]);
});

test("throws when the upstream response is not ok", async () => {
  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(null, { status: 503 });
    }),
  );

  await expect(subscribeToHttpStream(UPSTREAM_URL)).rejects.toThrow(
    "Upstream stream unavailable",
  );
});

test("throws when the upstream response has no body", async () => {
  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(null, { status: 200 });
    }),
  );

  await expect(subscribeToHttpStream(UPSTREAM_URL)).rejects.toThrow(
    "Upstream stream unavailable",
  );
});

test("handles a stream split across multiple chunks", async () => {
  const encoder = new TextEncoder();

  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            // Simulate a single JSON line delivered in two chunks
            controller.enqueue(encoder.encode('{"type":"pri'));
            controller.enqueue(encoder.encode('ce","value":42}\n'));
            controller.close();
          },
        }),
      );
    }),
  );

  const { events } = await subscribeToHttpStream<{ type: string }>(
    UPSTREAM_URL,
  );

  const collected: unknown[] = [];
  for await (const event of events) {
    collected.push(event);
  }

  expect(collected).toEqual([{ type: "price", value: 42 }]);
});

test("skips blank lines between events", async () => {
  const encoder = new TextEncoder();

  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                '{"type":"price","value":1}\n\n{"type":"price","value":2}\n',
              ),
            );
            controller.close();
          },
        }),
      );
    }),
  );

  const { events } = await subscribeToHttpStream<{ type: string }>(
    UPSTREAM_URL,
  );

  const collected: unknown[] = [];
  for await (const event of events) {
    collected.push(event);
  }

  expect(collected).toEqual([
    { type: "price", value: 1 },
    { type: "price", value: 2 },
  ]);
});
