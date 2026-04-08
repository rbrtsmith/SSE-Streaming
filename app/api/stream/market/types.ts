import { z } from "zod";
import {
  UpstreamPriceEventSchema,
  UpstreamMarketStatusEventSchema,
  UpstreamMarketEventSchema,
} from "./upstream-schemas";

export type UpstreamPriceEvent = z.infer<typeof UpstreamPriceEventSchema>;
export type UpstreamMarketStatusEvent = z.infer<
  typeof UpstreamMarketStatusEventSchema
>;
export type UpstreamMarketEvent = z.infer<typeof UpstreamMarketEventSchema>;

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
