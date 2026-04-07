export type UpstreamPriceEvent = {
  eventType: "price";
  instrument: string;
  mid: number;
  asOf: string;
};
export type UpstreamMarketStatusEvent = {
  eventType: "market-status";
  state: "open" | "closed" | "auction";
  asOf: string;
};

export type UpstreamMarketEvent =
  | UpstreamPriceEvent
  | UpstreamMarketStatusEvent;

export type SSEPriceEvent = {
  event: "price-update";
  data: {
    type: "price-update";
    symbol: string;
    price: number;
    timestamp: string;
  };
};

export type SSEMarketStatusEvent = {
  event: "market-status-update";
  data: {
    type: "market-status-update";
    status: "open" | "closed" | "auction";
    timestamp: string;
  };
};

export type SSEMarketEvent = SSEPriceEvent | SSEMarketStatusEvent;
