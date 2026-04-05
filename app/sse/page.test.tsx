import { render, screen } from "@testing-library/react";
import { http, HttpResponse, sse } from "msw";
import { server } from "../test/server";
import SSEPage from "./page";

test("renders streamed price and market status updates", async () => {
  server.use(
    sse<{
      "price-update": unknown;
      "market-status-update": unknown;
    }>("/api/stream/prices", ({ client }) => {
      client.send({
        event: "price-update",
        data: JSON.stringify({
          type: "price-update",
          symbol: "£",
          price: 101.25,
          timestamp: "2026-04-04T09:00:00.000Z",
        }),
      });

      client.send({
        event: "market-status-update",
        data: JSON.stringify({
          type: "market-status-update",
          status: "open",
          timestamp: "2026-04-04T09:00:01.000Z",
        }),
      });
    }),
  );

  render(<SSEPage />);

  expect(screen.getByText("Connection: connecting")).toBeInTheDocument();
  expect(screen.getByText("Latest price: Waiting...")).toBeInTheDocument();
  expect(screen.getByText("Market status: Unknown")).toBeInTheDocument();

  expect(await screen.findByText("Connection: open")).toBeInTheDocument();
  expect(await screen.findByText("Latest price: £ 101.25")).toBeInTheDocument();
  expect(await screen.findByText("Market status: open")).toBeInTheDocument();
});

test("shows an error state if the stream fails", async () => {
  server.use(
    http.get("/api/stream/prices", () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );

  render(<SSEPage />);

  expect(
    await screen.findByText("Connection error. Please try again later."),
  ).toBeInTheDocument();
});
