"use client";

import { useMarketStream } from "./use-market-stream";

export default function SSEPage() {
  const { connectionState, marketStatus, latestPrice } =
    useMarketStream("/api/stream/market");

  if (connectionState === "error") {
    return <p>Connection error. Please try again later.</p>;
  }

  return (
    <section aria-label="market ticker">
      <p>Connection: {connectionState}</p>
      <p>
        Latest price:{" "}
        {latestPrice
          ? `${latestPrice.symbol}${latestPrice.price}`
          : "Waiting..."}
      </p>
      <p>Market status: {marketStatus?.status ?? "Unknown"}</p>
    </section>
  );
}
