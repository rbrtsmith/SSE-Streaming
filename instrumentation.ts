let mswStarted = false;

export async function register() {
  const isNodeRuntime = process.env.NEXT_RUNTIME === "nodejs";
  const isDevMocksEnabled = process.env.MSW === "true";
  const isTest = process.env.NODE_ENV === "test" || !!process.env.VITEST;

  if (!isNodeRuntime || !isDevMocksEnabled || isTest || mswStarted) {
    return;
  }

  const { server } = await import("./app/dev-mocks/server");

  server.listen({
    onUnhandledRequest: "bypass",
  });

  mswStarted = true;
}
