import { z } from "zod";

export const UpstreamPriceEventSchema = z.object({
  eventType: z.literal("price"),
  instrument: z.string(),
  mid: z.number(),
  asOf: z.string(),
});

export const UpstreamMarketStatusEventSchema = z.object({
  eventType: z.literal("market-status"),
  state: z.enum(["open", "closed", "auction"]),
  asOf: z.string(),
});

export const UpstreamMarketEventSchema = z.discriminatedUnion("eventType", [
  UpstreamPriceEventSchema,
  UpstreamMarketStatusEventSchema,
]);
