import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { createUpstreamStream, readSSEEvents } from "@/test/utils";

import { GET } from "./route";
import type { UpstreamPriceEvent, UpstreamMarketStatusEvent } from "./types";

const UPSTREAM_STREAM_URL = `${process.env.UPSTREAM_BASE_URL}/market-stream`;

test("returns SSE and transforms upstream HTTP-streamed events", async () => {
  server.use(
    http.get(UPSTREAM_STREAM_URL, () => {
      return new HttpResponse(
        createUpstreamStream([
          {
            eventType: "price",
            instrument: "GBP",
            mid: 101.25,
            asOf: "2026-04-05T10:00:00.000Z",
          } satisfies UpstreamPriceEvent,
          {
            eventType: "market-status",
            state: "open",
            asOf: "2026-04-05T10:00:01.000Z",
          } satisfies UpstreamMarketStatusEvent,
          {
            eventType: "price",
            instrument: "GBP",
            mid: 102.1,
            asOf: "2026-04-05T10:00:02.000Z",
          } satisfies UpstreamPriceEvent,
        ]),
      );
    }),
  );

  const response = await GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  expect(response.headers.get("Connection")).toBe("keep-alive");
  expect(response.body).toBeTruthy();

  const events = await readSSEEvents(response.body!);

  expect(events[0]).toEqual({
    event: "connected",
    data: expect.objectContaining({ type: "connected" }),
  });

  expect(events[1]).toEqual({
    event: "price-update",
    data: {
      type: "price-update",
      symbol: "£",
      price: 101.25,
      timestamp: "2026-04-05T10:00:00.000Z",
    },
  });

  expect(events[2]).toEqual({
    event: "market-status-update",
    data: {
      type: "market-status-update",
      status: "open",
      timestamp: "2026-04-05T10:00:01.000Z",
    },
  });

  expect(events[3]).toEqual({
    event: "price-update",
    data: {
      type: "price-update",
      symbol: "£",
      price: 102.1,
      timestamp: "2026-04-05T10:00:02.000Z",
    },
  });
});

test("uses an empty symbol for an unrecognised instrument", async () => {
  server.use(
    http.get(UPSTREAM_STREAM_URL, () => {
      return new HttpResponse(
        createUpstreamStream([
          {
            eventType: "price",
            instrument: "USD",
            mid: 1.25,
            asOf: "2026-04-05T10:00:00.000Z",
          } satisfies UpstreamPriceEvent,
        ]),
      );
    }),
  );

  const response = await GET();
  const events = await readSSEEvents(response.body!);

  const priceEvent = events.find((e) => e.event === "price-update");
  expect(priceEvent?.data).toMatchObject({ symbol: "" });
});

test("sends a stream-error event when the upstream emits an unknown event type", async () => {
  server.use(
    http.get(UPSTREAM_STREAM_URL, () => {
      return new HttpResponse(
        createUpstreamStream([{ eventType: "unknown-future-type" }]),
      );
    }),
  );

  const response = await GET();
  const events = await readSSEEvents(response.body!);

  expect(events.at(-1)).toEqual({
    event: "stream-error",
    data: expect.objectContaining({ type: "stream-error" }),
  });
});

test("returns 502 when the upstream stream cannot be established", async () => {
  server.use(
    http.get(UPSTREAM_STREAM_URL, () => {
      return new HttpResponse(null, { status: 503 });
    }),
  );

  const response = await GET();

  expect(response.status).toBe(502);
  expect(await response.text()).toBe("Upstream stream unavailable");
});
