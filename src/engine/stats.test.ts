import { describe, expect, it } from "vitest";
import { enqueueCraft } from "./crafting";
import { produceCapped } from "./inventory";
import { advance, createNewGame } from "./simulation";

describe("production stats", () => {
  it("records every tier at its own resolution", () => {
    const s = createNewGame();
    for (let i = 0; i < 30; i++) {
      produceCapped(s, "stone", 1);
      advance(s, 10); // 1 stone per second for 30s
    }
    expect(s.stats.tiers["5s"].history).toHaveLength(50); // one sample per tick, last 5s
    expect(s.stats.tiers["5s"].history.filter((x) => x.produced.stone === 1)).toHaveLength(5);
    expect(s.stats.tiers["1m"].history).toHaveLength(30);
    expect(s.stats.tiers["1m"].history.every((x) => x.produced.stone === 1)).toBe(true);
    expect(s.stats.tiers["10m"].history).toHaveLength(6);
    expect(s.stats.tiers["10m"].history[0]!.produced.stone).toBe(5);
    expect(s.stats.tiers["1h"].history).toHaveLength(1);
    expect(s.stats.tiers["1h"].history[0]!.produced.stone).toBe(30);
    expect(s.stats.tiers["10h"].history).toHaveLength(0);
    expect(s.stats.tiers["10h"].pending.produced.stone).toBe(30);
  });

  it("keeps lifetime totals for production and consumption", () => {
    const s = createNewGame();
    s.inventory["iron-plate"] = 10;
    enqueueCraft(s, "iron-gear-wheel", 3);
    advance(s, 20);
    expect(s.stats.lifetime["iron-gear-wheel"]).toBe(3);
    expect(s.stats.lifetimeConsumed["iron-plate"]).toBe(6);
  });

  it("keeps a bounded window", () => {
    const s = createNewGame();
    advance(s, 10 * 200);
    expect(s.stats.tiers["1m"].history).toHaveLength(60);
    expect(s.stats.tiers["10m"].history).toHaveLength(40);
  });
});
