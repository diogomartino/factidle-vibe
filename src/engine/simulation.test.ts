import { freeze } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { enqueueCraft } from "./crafting";
import { advanced } from "./simulation";
import { setup } from "./test-utils";

describe("advanced", () => {
  it("never changes the previous state, even through crafts, research, launches and stat samples", () => {
    const s = setup({
      items: { coal: 100, stone: 10, "iron-plate": 100, "processing-unit": 1000, "low-density-structure": 1000, "rocket-fuel": 20 },
      machines: { "burner-mining-drill": { count: 2, allocations: { "mine-iron-ore": 1 } }, "solar-panel": { count: 100 }, "rocket-silo": { count: 1 } },
    });
    s.inventory["rocket-part"] = 99;
    s.stats.lifetime["iron-plate"] = 49; // one more plate researches Steam power
    s.stats.lifetime["copper-plate"] = 10;
    s.inventory["iron-ore"] = 10;
    s.machines["stone-furnace"] = { ...s.machines["stone-furnace"], count: 1, allocations: { "iron-plate": 1 } };
    enqueueCraft(s, "stone-furnace", 2);
    enqueueCraft(s, "iron-gear-wheel", 2);
    const before = JSON.stringify(s);
    // Immer deep-freezes state after every other action; writing to it would throw here.
    freeze(s, true);
    const next = advanced(s, 100);
    expect(JSON.stringify(s)).toBe(before);
    expect(next.rocket.launches).toBe(1);
    expect(next.research.researched).toContain("steam-power");
    expect(next.machines["stone-furnace"].count).toBe(3);
    expect(next.queue).toEqual([]);
    expect(next.stats.tiers["1m"].history.length).toBe(10);
  });
});
