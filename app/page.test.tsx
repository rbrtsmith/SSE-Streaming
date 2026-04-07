import { render, screen } from "@testing-library/react";

import Homepage from "./page";

test("renders the page", async () => {
  render(<Homepage />);

  expect(
    screen.getByRole("link", { name: /Market Ticker \(SSE\)/i }),
  ).toHaveAttribute("href", "/sse");
});
