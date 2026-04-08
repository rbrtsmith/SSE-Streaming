import {
  createSseResponse,
  type SseEvent,
} from "@/app/api/stream/create-see-response";
import { subscribeToHttpStream } from "@/app/api/stream/http-adapter";

import { mapEvent } from "./map-event";
import { UpstreamMarketEventSchema } from "./upstream-schemas";
import { type UpstreamMarketEvent } from "./types";

const UPSTREAM_URL = `${process.env.UPSTREAM_BASE_URL}/market-stream`;

async function* extractAndMapEvents(
  upstream: AsyncGenerator<UpstreamMarketEvent>,
): AsyncGenerator<SseEvent> {
  yield {
    event: "connected",
    data: { type: "connected", timestamp: new Date().toISOString() },
  };

  for await (const event of upstream) {
    yield mapEvent(event);
  }
}

export async function GET() {
  try {
    const feed = await subscribeToHttpStream(
      UPSTREAM_URL,
      UpstreamMarketEventSchema,
    );

    return createSseResponse(extractAndMapEvents(feed.events));
  } catch {
    return new Response("Upstream stream unavailable", { status: 502 });
  }
}
