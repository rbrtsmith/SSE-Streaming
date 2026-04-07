import { useEffect, useState } from "react";
import type { ConnectionState } from "../types";
import type {
  SSEPriceEvent,
  SSEMarketStatusEvent,
} from "../api/stream/market/types";

type PriceData = SSEPriceEvent["data"];
type MarketStatusData = SSEMarketStatusEvent["data"];

export const useMarketStream = (url: string) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [latestPrice, setLatestPrice] = useState<PriceData | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatusData | null>(
    null,
  );

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnectionState("open");

    eventSource.onerror = () => {
      setConnectionState(
        eventSource.readyState === EventSource.CLOSED ? "error" : "connecting",
      );
    };

    eventSource.addEventListener("price-update", (event) => {
      const data = JSON.parse(event.data) as PriceData;
      setLatestPrice(data);
    });

    eventSource.addEventListener("market-status-update", (event) => {
      const data = JSON.parse(event.data) as MarketStatusData;
      setMarketStatus(data);
    });

    return () => {
      setConnectionState("closed");
      eventSource.close();
    };
  }, [url]);

  return { connectionState, latestPrice, marketStatus };
};
