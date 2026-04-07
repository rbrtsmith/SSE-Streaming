import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Streaming Demo</h1>
      <nav>
        <ul className="flex gap-4">
          <li>
            <Link
              href="/sse"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Market Ticker (SSE)
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
