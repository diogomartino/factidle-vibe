import { describe, expect, it } from "vitest";
import { addToSelection, MAX_SERIES, removeFromSelection, toggleInSelection } from "./stats-utils";
import type { ChartSelection } from "./stats-utils";

describe("chart selection", () => {
  const start: ChartSelection[] = [{ id: "iron-plate", slot: 0 }];

  it("adds items of the same unit with the next free color slot", () => {
    const two = addToSelection(start, "copper-plate");
    expect(two).toEqual([...start, { id: "copper-plate", slot: 1 }]);
    const reused = addToSelection(removeFromSelection(addToSelection(two, "coal"), "copper-plate"), "stone");
    expect(reused.map((s) => [s.id, s.slot])).toEqual([["iron-plate", 0], ["coal", 2], ["stone", 1]]);
  });

  it("replaces the selection when the unit differs", () => {
    expect(addToSelection(start, "electricity")).toEqual([{ id: "electricity", slot: 0 }]);
    expect(addToSelection([{ id: "water", slot: 0 }], "steam")).toHaveLength(2); // both fluids
  });

  it("keeps at least one and at most the palette size", () => {
    expect(toggleInSelection(start, "iron-plate")).toEqual(start);
    const ids = ["copper-plate", "coal", "stone", "iron-ore", "copper-ore", "pipe", "stone-brick", "iron-gear-wheel"] as const;
    const full = ids.reduce(addToSelection, start);
    expect(full).toHaveLength(MAX_SERIES);
  });
});
