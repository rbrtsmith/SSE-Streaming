import type { UpstreamMarketEvent, SSEMarketEvent } from "./types";

const instrumentToSymbolMap: Record<string, string> = {
  GBP: "£",
};

export function mapEvent(upstream: UpstreamMarketEvent): SSEMarketEvent {
  if (upstream.eventType === "price") {
    return {
      event: "price-update",
      data: {
        type: "price-update",
        symbol: instrumentToSymbolMap[upstream.instrument] ?? "",
        price: upstream.mid,
        timestamp: upstream.asOf,
      },
    };
  }

  return {
    event: "market-status-update",
    data: {
      type: "market-status-update",
      status: upstream.state,
      timestamp: upstream.asOf,
    },
  };
}
