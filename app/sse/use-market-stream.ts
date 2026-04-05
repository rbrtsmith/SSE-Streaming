import { useEffect, useState } from "react";
import type { ConnectionState } from "../types";

type PriceUpdate = {
  type: "price-update";
  symbol: string;
  price: number;
  timestamp: string;
};

type MarketStatusUpdate = {
  type: "market-status-update";
  status: "open" | "closed" | "auction";
  timestamp: string;
};

export const useMarketStream = (url: string) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [latestPrice, setLatestPrice] = useState<PriceUpdate | null>(null);
  const [marketStatus, setMarketStatus] = useState<
    MarketStatusUpdate["status"] | null
  >(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnectionState("open");

    eventSource.onerror = () => setConnectionState("error");

    eventSource.addEventListener("price-update", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as PriceUpdate;
      setLatestPrice(data);
    });

    eventSource.addEventListener("market-status-update", (event) => {
      const data = JSON.parse(
        (event as MessageEvent).data,
      ) as MarketStatusUpdate;
      setMarketStatus(data.status);
    });

    return () => {
      setConnectionState("closed");
      eventSource.close();
    };
  }, [url]);

  return { connectionState, latestPrice, marketStatus };
};
