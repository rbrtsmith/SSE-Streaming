import "@testing-library/jest-dom";
import { EventSource } from "eventsource";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

globalThis.EventSource = EventSource;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
