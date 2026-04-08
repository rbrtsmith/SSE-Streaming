import { z } from "zod";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { createUpstreamStream } from "@/test/utils";
import { subscribeToHttpStream } from "./http-adapter";

const UPSTREAM_URL = "http://upstream.test/stream";

const TestEventSchema = z.object({ type: z.string() });

test("yields parsed and validated objects for each newline-delimited line", async () => {
  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        createUpstreamStream([{ type: "price" }, { type: "status" }]),
      );
    }),
  );

  const { events } = await subscribeToHttpStream(UPSTREAM_URL, TestEventSchema);

  const collected: unknown[] = [];
  for await (const event of events) {
    collected.push(event);
  }

  expect(collected).toEqual([{ type: "price" }, { type: "status" }]);
});

test("throws when the upstream response is not ok", async () => {
  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(null, { status: 503 });
    }),
  );

  await expect(
    subscribeToHttpStream(UPSTREAM_URL, TestEventSchema),
  ).rejects.toThrow("Upstream stream unavailable");
});

test("throws when the upstream response has no body", async () => {
  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(null, { status: 200 });
    }),
  );

  await expect(
    subscribeToHttpStream(UPSTREAM_URL, TestEventSchema),
  ).rejects.toThrow("Upstream stream unavailable");
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
            controller.enqueue(encoder.encode('ce"}\n'));
            controller.close();
          },
        }),
      );
    }),
  );

  const { events } = await subscribeToHttpStream(UPSTREAM_URL, TestEventSchema);

  const collected: unknown[] = [];
  for await (const event of events) {
    collected.push(event);
  }

  expect(collected).toEqual([{ type: "price" }]);
});

test("throws when the upstream stream contains malformed JSON", async () => {
  const encoder = new TextEncoder();

  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode("not-valid-json\n"));
            controller.close();
          },
        }),
      );
    }),
  );

  const { events } = await subscribeToHttpStream(UPSTREAM_URL, TestEventSchema);

  await expect(async () => {
    for await (const _ of events) {
      /* consume */
    }
  }).rejects.toThrow();
});

test("throws when a line fails schema validation", async () => {
  const encoder = new TextEncoder();

  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('{"unexpected":true}\n'));
            controller.close();
          },
        }),
      );
    }),
  );

  const { events } = await subscribeToHttpStream(UPSTREAM_URL, TestEventSchema);

  await expect(async () => {
    for await (const _ of events) {
      /* consume */
    }
  }).rejects.toThrow();
});

test("skips blank lines between events", async () => {
  const encoder = new TextEncoder();

  server.use(
    http.get(UPSTREAM_URL, () => {
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('{"type":"price"}\n\n{"type":"status"}\n'),
            );
            controller.close();
          },
        }),
      );
    }),
  );

  const { events } = await subscribeToHttpStream(UPSTREAM_URL, TestEventSchema);

  const collected: unknown[] = [];
  for await (const event of events) {
    collected.push(event);
  }

  expect(collected).toEqual([{ type: "price" }, { type: "status" }]);
});
