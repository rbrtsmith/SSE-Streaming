import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./app/test/setup.ts"],
    onConsoleLog(log) {
      if (log.includes("[MSW]")) return false;
    },
  },
});
