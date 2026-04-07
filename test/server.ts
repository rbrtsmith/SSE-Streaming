import { setupServer } from "msw/node";
import { defaultBFFHandlers, defaultBrowserHandlers } from "./default-handlers";

export const server = setupServer(
  ...defaultBFFHandlers,
  ...defaultBrowserHandlers,
);
