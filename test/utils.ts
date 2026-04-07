import { delay } from "msw";

function parseEvents(raw: string) {
  return raw
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => {
      const eventLine = chunk.match(/^event: (.+)$/m);
      const dataLine = chunk.match(/^data: (.+)$/m);
      return {
        event: eventLine?.[1],
        data: dataLine ? JSON.parse(dataLine[1]) : undefined,
      };
    });
}

export async function readSSEEvents(
  stream: ReadableStream<Uint8Array>,
  eventCount = 10,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let output = "";
  let done = false;

  while (!done && parseEvents(output).length < eventCount) {
    const result = await reader.read();
    done = result.done;

    if (result.value) {
      output += decoder.decode(result.value, { stream: true });
    }
  }

  reader.releaseLock();

  return parseEvents(output);
}

export function createUpstreamStream(lines: unknown[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        await delay(5);
      }

      controller.close();
    },
  });
}
