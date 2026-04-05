import { GET } from "./route";

beforeEach(() => {
  vi.useFakeTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

function createStreamReader(response: Response) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let output = "";

  const readOne = async () => {
    const { value } = await reader.read();
    if (value) output += decoder.decode(value);
  };

  const readChunks = async (count: number) => {
    for (let i = 0; i < count; i++) {
      await readOne();
    }
  };

  return {
    readChunks,
    getOutput: () => output,
    releaseLock: () => reader.releaseLock(),
  };
}

function parseEvent(name: string, output: string) {
  const chunks = output.split("\n\n").filter(Boolean);
  const chunk = chunks.find((c) => c.includes(`event: ${name}`));
  return JSON.parse(chunk!.split("data: ")[1]);
}

test("returns SSE headers", async () => {
  const response = await GET();

  expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  expect(response.headers.get("Connection")).toBe("keep-alive");
});

test("emits price and market status events in SSE format", async () => {
  const response = await GET();
  const { readChunks, getOutput, releaseLock } = createStreamReader(response);

  // advance 5s to trigger price-update (1s intervals) and market-status-update (5s)
  // expected chunks: 1 connected + 5 price-updates + 1 market-status-update = 7
  await vi.advanceTimersByTimeAsync(5_000);
  await readChunks(7);

  releaseLock();

  expect(parseEvent("price-update", getOutput())).toEqual(
    expect.objectContaining({
      type: "price-update",
      symbol: "£",
      price: expect.any(Number),
      timestamp: expect.any(String),
    }),
  );

  expect(parseEvent("market-status-update", getOutput())).toEqual(
    expect.objectContaining({
      type: "market-status-update",
      status: expect.stringMatching(/^(open|closed|auction)$/),
      timestamp: expect.any(String),
    }),
  );
});
