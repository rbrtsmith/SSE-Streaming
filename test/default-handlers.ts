import { http, HttpResponse, sse } from "msw";

import { createUpstreamStream } from "./utils";

const UPSTREAM_STREAM_URL = `${process.env.UPSTREAM_BASE_URL}/market-stream`;

export const defaultBFFHandlers = [
  http.get(UPSTREAM_STREAM_URL, () => {
    return new HttpResponse(createUpstreamStream([]), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }),
];

export const defaultBrowserHandlers = [
  sse<{
    "price-update": unknown;
  }>("/api/stream/market", ({ client }) => {
    client.send({
      event: "price-update",
      data: JSON.stringify({
        type: "price-update",
        symbol: "£",
        price: 0,
        timestamp: "2026-04-04T09:00:00.000Z",
      }),
    });
  }),
];
