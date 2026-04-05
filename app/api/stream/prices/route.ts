export const runtime = "nodejs";

function createPriceTick(symbol: string, base: number) {
  const variance = (Math.random() - 0.5) * 2;
  return {
    type: "price-update",
    symbol,
    price: Number((base + variance).toFixed(2)),
    timestamp: new Date().toISOString(),
  };
}

function createMarketStatusTick() {
  const options = ["open", "closed", "auction"];
  const randomIndex = Math.floor(Math.random() * options.length);
  const choice = options[randomIndex];
  return {
    type: "market-status-update",
    status: choice,
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (eventName: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${eventName}\n` + `data: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      send("connected", {
        message: "SSE stream established",
        timestamp: new Date().toISOString(),
      });

      const priceUpdateinterval = setInterval(() => {
        send("price-update", createPriceTick("£", 100));
      }, 1_000);

      const marketStatusInterval = setInterval(() => {
        send("market-status-update", createMarketStatusTick());
      }, 5_000);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15_000);

      const close = () => {
        clearInterval(priceUpdateinterval);
        clearInterval(marketStatusInterval);
        clearInterval(heartbeat);
        controller.close();
      };

      // crude timeout just for demo purposes
      const timeout = setTimeout(() => {
        close();
      }, 60_000);

      return () => {
        clearInterval(priceUpdateinterval);
        clearInterval(marketStatusInterval);
        clearInterval(heartbeat);
        clearTimeout(timeout);
      };
    },
    cancel() {
      // useful place for cleanup if needed
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
