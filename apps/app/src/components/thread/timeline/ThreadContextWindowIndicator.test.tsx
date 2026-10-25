// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadContextWindowUsage } from "@bb/server-contract";
import { ThreadContextWindowCard } from "./ThreadContextWindowIndicator";

const usage: ThreadContextWindowUsage = {
  usedTokens: 120_000,
  modelContextWindow: 200_000,
  estimated: true,
};

afterEach(() => {
  cleanup();
});

describe("ThreadContextWindowCard compact action", () => {
  it("omits the Compact button without a compact action", () => {
    render(<ThreadContextWindowCard usage={usage} />);

    expect(screen.queryByRole("button", { name: "Compact" })).toBeNull();
  });

  it("runs the compact action when the thread is idle", () => {
    const onCompact = vi.fn();
    render(
      <ThreadContextWindowCard
        usage={usage}
        compactAction={{ disabled: false, onCompact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));

    expect(onCompact).toHaveBeenCalledTimes(1);
  });

  it("keeps the Compact button disabled while the thread is busy", () => {
    const onCompact = vi.fn();
    render(
      <ThreadContextWindowCard
        usage={usage}
        compactAction={{ disabled: true, onCompact }}
      />,
    );

    const button = screen.getByRole("button", { name: "Compact" });
    fireEvent.click(button);

    expect(button).toHaveProperty("disabled", true);
    expect(onCompact).not.toHaveBeenCalled();
  });
});
