import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusHero } from "./StatusHero.js";

describe("StatusHero", () => {
  it("assigns progressive pulse indices to all six blocks during early indexing", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.1.1", coreHeight: 3_000_000, indexedHeight: 84_000, percent: 2.8, message: "Indexing Bitcoin blocks" }} />);
    const art = container.querySelector(".index-art");
    const blocks = Array.from(container.querySelectorAll<HTMLElement>(".index-block"));

    expect(art).toHaveClass("is-syncing");
    expect(art).not.toHaveClass("is-complete");
    expect(blocks).toHaveLength(6);
    expect(blocks.map((block) => block.style.getPropertyValue("--pulse-index"))).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(blocks.every((block) => !block.classList.contains("is-indexed"))).toBe(true);
    expect(blocks.every((block) => !block.classList.contains("is-animating"))).toBe(true);
  });

  it("renders an independently fadeable pulse layer inside every indexing block", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.1.1", coreHeight: 100, indexedHeight: 42, percent: 42, message: "Indexing Bitcoin blocks" }} />);

    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block-pulse-fade")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block-pulse")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block-complete")).toHaveLength(6);
  });


  it("uses accurate indexing copy and exposes progress accessibly", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "2.1.1", coreHeight: 101, indexedHeight: 100, percent: 99.01, message: "Indexing Bitcoin blocks" }} />);

    expect(screen.getByRole("status")).toHaveAccessibleName("Fulcrum is indexing");
    expect(screen.getByText("Indexing Bitcoin blocks")).toBeInTheDocument();
    expect(screen.queryByText("Synchronized")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99.01");
    expect(container.querySelectorAll(".index-block.is-indexed")).toHaveLength(5);
    expect(container.querySelectorAll(".index-block.is-animating")).toHaveLength(0);
    expect(container.querySelector(".index-art")).toHaveClass("is-syncing");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-complete");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
  });

  it("renders ready as six complete blocks without a syncing class", () => {
    const { container } = render(<StatusHero status={{ state: "ready", version: "2.1.1", coreHeight: 101, indexedHeight: 101, percent: 100, message: "Fulcrum is synchronized" }} />);
    expect(container.querySelector(".index-art")).toHaveClass("is-complete");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block.is-indexed")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block.is-animating")).toHaveLength(0);
  });

  it.each(["waiting-for-core", "connecting", "degraded"] as const)("does not animate blocks in the %s state", (state) => {
    const { container } = render(<StatusHero status={{ state, version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Unavailable" }} />);
    expect(container.querySelector(".index-art")).not.toHaveClass("is-syncing");
    expect(container.querySelector(".index-art")).not.toHaveClass("is-complete");
    expect(container.querySelectorAll(".index-block")).toHaveLength(6);
    expect(container.querySelectorAll(".index-block.is-animating")).toHaveLength(0);
  });
});
