import { render, screen } from "@testing-library/react";
import { http, HttpResponse, sse } from "msw";
import { server } from "@/test/server";
import type {
  SSEPriceEvent,
  SSEMarketStatusEvent,
} from "@/app/api/stream/market/types";

import SSEPage from "./page";

test("renders streamed price and market status updates", async () => {
  server.use(
    sse<{
      "price-update": SSEPriceEvent["data"];
      "market-status-update": SSEMarketStatusEvent["data"];
    }>("/api/stream/market", ({ client }) => {
      client.send({
        event: "price-update",
        data: {
          type: "price-update",
          symbol: "£",
          price: 101.25,
          timestamp: "2026-04-04T09:00:00.000Z",
        },
      });

      client.send({
        event: "market-status-update",
        data: {
          type: "market-status-update",
          status: "open",
          timestamp: "2026-04-04T09:00:01.000Z",
        },
      });
    }),
  );

  render(<SSEPage />);

  expect(screen.getByText("Connection: connecting")).toBeInTheDocument();
  expect(screen.getByText("Latest price: Waiting...")).toBeInTheDocument();
  expect(screen.getByText("Market status: Unknown")).toBeInTheDocument();

  expect(await screen.findByText("Connection: open")).toBeInTheDocument();
  expect(await screen.findByText("Latest price: £101.25")).toBeInTheDocument();
  expect(await screen.findByText("Market status: open")).toBeInTheDocument();
});

test("shows an error state if the stream cannot be established", async () => {
  server.use(
    http.get("/api/stream/market", () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );

  render(<SSEPage />);

  expect(
    await screen.findByText("Connection error. Please try again later."),
  ).toBeInTheDocument();
});

test("shows reconnecting state when an open stream drops", async () => {
  server.use(
    sse("/api/stream/market", ({ client }) => {
      // Close immediately after opening — eventsource treats this as a
      // reconnectable drop, firing onerror with readyState CONNECTING
      client.close();
    }),
  );

  render(<SSEPage />);

  expect(await screen.findByText("Connection: connecting")).toBeInTheDocument();
});
