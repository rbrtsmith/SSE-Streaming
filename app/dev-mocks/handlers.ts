// MSW handlers for local development. These simulate the upstream market-stream
// API so the app can run without a real backend. Loaded via instrumentation.ts
// when MSW=true.

import { http, HttpResponse, delay } from "msw";

function randomPrice(base: number) {
  const variance = (Math.random() - 0.5) * 2;
  return Number((base + variance).toFixed(2));
}

function randomStatus() {
  const options = ["open", "closed", "auction"] as const;
  return options[Math.floor(Math.random() * options.length)];
}

const UPSTREAM_STREAM_URL = `${process.env.UPSTREAM_BASE_URL}/market-stream`;

export const handlers = [
  http.get(UPSTREAM_STREAM_URL, () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let tick = 0;

        while (true) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                eventType: "price",
                instrument: "GBP",
                mid: randomPrice(100),
                asOf: new Date().toISOString(),
              }) + "\n",
            ),
          );

          if (tick % 5 === 0) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  eventType: "market-status",
                  state: randomStatus(),
                  asOf: new Date().toISOString(),
                }) + "\n",
              ),
            );
          }

          tick++;
          await delay(1_000);
        }
      },
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }),
];
