export type UpstreamFeed<T> = {
  events: AsyncGenerator<T>;
};

export async function subscribeToHttpStream<T>(
  url: string,
): Promise<UpstreamFeed<T>> {
  const response = await fetch(url, {
    headers: { Accept: "text/plain" },
  });

  if (!response.ok || !response.body) {
    throw new Error("Upstream stream unavailable");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

  async function* readEvents(): AsyncGenerator<T> {
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += value;

        const lines = buffer.split("\n");
        // v8 ignore next -- split() always yields ≥1 element so pop() is never undefined
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          yield JSON.parse(line) as T;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  return { events: readEvents() };
}
