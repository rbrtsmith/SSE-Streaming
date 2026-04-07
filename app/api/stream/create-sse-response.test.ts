import { readSSEEvents } from "@/test/utils";
import { createSseResponse } from "./create-see-response";
import type { SseEvent } from "./create-see-response";

async function* makeEvents(events: SseEvent[]): AsyncIterable<SseEvent> {
  for (const event of events) {
    yield event;
  }
}

async function* failingEvents(): AsyncIterable<SseEvent> {
  yield { event: "first", data: { value: 1 } };
  throw new Error("upstream failure");
}

test("returns a Response with SSE headers", async () => {
  const response = createSseResponse(makeEvents([]));

  expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  expect(response.headers.get("Connection")).toBe("keep-alive");
});

test("streams each event in SSE format", async () => {
  const response = createSseResponse(
    makeEvents([
      { event: "price-update", data: { symbol: "£", price: 101.25 } },
      { event: "market-status", data: { status: "open" } },
    ]),
  );

  const events = await readSSEEvents(response.body!, 2);

  expect(events[0]).toEqual({
    event: "price-update",
    data: { symbol: "£", price: 101.25 },
  });

  expect(events[1]).toEqual({
    event: "market-status",
    data: { status: "open" },
  });
});

test("emits a stream-error event and closes when the source throws", async () => {
  const response = createSseResponse(failingEvents());

  const events = await readSSEEvents(response.body!, 2);

  expect(events[0]).toEqual({
    event: "first",
    data: { value: 1 },
  });

  expect(events[1]).toEqual({
    event: "stream-error",
    data: expect.objectContaining({
      type: "stream-error",
      message: "Stream failed",
    }),
  });
});
