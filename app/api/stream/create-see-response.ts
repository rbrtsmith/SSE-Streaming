function toSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export type SseEvent = {
  event: string;
  data: unknown;
};

export function createSseResponse(events: AsyncIterable<SseEvent>) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const { event, data } of events) {
          controller.enqueue(encoder.encode(toSse(event, data)));
        }

        controller.close();
      } catch {
        controller.enqueue(
          encoder.encode(
            toSse("stream-error", {
              type: "stream-error",
              message: "Stream failed",
              timestamp: new Date().toISOString(),
            }),
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
