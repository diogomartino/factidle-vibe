import { describe, expect, it } from "vitest";
import { cancelCraft, enqueueCraft, maxCraftable, progressQueue } from "./crafting";
import { ITEM_IDS } from "./catalog";
import { advance, createNewGame } from "./simulation";

describe("crafting queue", () => {
  it("reserves ingredients on enqueue and delivers on completion", () => {
    const s = createNewGame();
    expect(enqueueCraft(s, "iron-gear-wheel", 2)).toBeNull();
    expect(s.inventory["iron-plate"]).toBe(4);
    progressQueue(s, 0.5);
    expect(s.inventory["iron-gear-wheel"]).toBe(1);
    progressQueue(s, 0.5);
    expect(s.inventory["iron-gear-wheel"]).toBe(2);
    expect(s.queue).toHaveLength(0);
  });

  it("rejects crafts with missing raw ingredients and changes nothing", () => {
    const s = createNewGame();
    expect(enqueueCraft(s, "pipe", 9)).toEqual({ "iron-plate": 1 });
    expect(s.inventory["iron-plate"]).toBe(8);
    expect(s.queue).toHaveLength(0);
  });

  it("auto-queues missing intermediates and places buildings", () => {
    const s = createNewGame();
    s.inventory["iron-plate"] = 9;
    s.inventory.stone = 5;
    expect(enqueueCraft(s, "burner-mining-drill")).toBeNull();
    // 3 gears + 1 stone furnace sub-jobs run before the drill
    expect(s.queue.map((j) => j.recipe)).toEqual(["iron-gear-wheel", "iron-gear-wheel", "iron-gear-wheel", "stone-furnace", "burner-mining-drill"]);
    progressQueue(s, 10);
    expect(s.machines["burner-mining-drill"].count).toBe(2);
    expect(s.inventory["iron-gear-wheel"]).toBe(0);
    expect(s.inventory["stone-furnace"]).toBe(0);
    expect(s.inventory["iron-plate"]).toBe(0);
  });

  it("keeps surplus from multi-yield recipes", () => {
    const s = createNewGame();
    s.inventory["copper-plate"] = 2;
    s.inventory["iron-plate"] = 1;
    expect(enqueueCraft(s, "electronic-circuit")).toBeNull(); // needs 3 cable = 2 crafts of 2
    progressQueue(s, 10);
    expect(s.inventory["electronic-circuit"]).toBe(1);
    expect(s.inventory["copper-cable"]).toBe(1);
  });

  it("refunds everything on cancel, including finished sub-jobs", () => {
    const s = createNewGame();
    s.inventory["iron-plate"] = 9;
    s.inventory.stone = 5;
    enqueueCraft(s, "burner-mining-drill");
    progressQueue(s, 1.2); // two gears done
    cancelCraft(s, s.queue[0]!.group);
    expect(s.queue).toHaveLength(0);
    expect(s.inventory["iron-plate"]).toBe(5); // 3 held by the drill + 2 by the unfinished gear
    expect(s.inventory["iron-gear-wheel"]).toBe(2);
    expect(s.inventory.stone).toBe(5);
  });

  it("batches auto-crafted ingredients across a multi-craft order", () => {
    const s = createNewGame();
    s.inventory["iron-plate"] = 18;
    s.inventory.stone = 10;
    expect(enqueueCraft(s, "burner-mining-drill", 2)).toBeNull();
    expect(s.queue.map((j) => j.recipe)).toEqual([
      ...Array<string>(6).fill("iron-gear-wheel"),
      "stone-furnace",
      "stone-furnace",
      "burner-mining-drill",
      "burner-mining-drill",
    ]);
    progressQueue(s, 20);
    expect(s.machines["burner-mining-drill"].count).toBe(3);
    expect(s.inventory["iron-gear-wheel"]).toBe(0);
  });

  it("orders deeper ingredients first (cables before circuits before the lab)", () => {
    const s = createNewGame();
    s.inventory["iron-plate"] = 100;
    s.inventory["copper-plate"] = 100;
    expect(enqueueCraft(s, "lab")).toBeNull();
    const order = [...new Set(s.queue.map((j) => j.recipe))];
    expect(order.indexOf("copper-cable")).toBeLessThan(order.indexOf("electronic-circuit"));
    expect(order.indexOf("iron-gear-wheel")).toBeLessThan(order.indexOf("transport-belt"));
    expect(order.at(-1)).toBe("lab");
    progressQueue(s, 120);
    expect(s.machines.lab.count).toBe(1);
  });

  it("cancels one craft of a batch with its own ingredients", () => {
    const s = createNewGame();
    s.inventory["iron-plate"] = 18;
    s.inventory.stone = 10;
    enqueueCraft(s, "burner-mining-drill", 2);
    cancelCraft(s, s.queue.at(-1)!.group);
    expect(s.queue.map((j) => j.recipe)).toEqual(["iron-gear-wheel", "iron-gear-wheel", "iron-gear-wheel", "stone-furnace", "burner-mining-drill"]);
    expect(s.inventory["iron-plate"]).toBe(9);
    expect(s.inventory.stone).toBe(5);
  });

  it("uses machine-made stock without crafting extras (no floating-point drift)", () => {
    const s = createNewGame();
    for (const id of ITEM_IDS) s.inventory[id] = 0;
    s.inventory["iron-plate"] = 1000;
    s.inventory.coal = 1000;
    s.machines["offshore-pump"].count = 1;
    s.machines.boiler.count = 1;
    s.machines["steam-engine"].count = 1;
    s.machines["assembling-machine-1"] = { count: 1, enabled: true, running: 1, priority: 0, allocations: { "iron-gear-wheel": 1 }, modules: {} };
    for (let second = 1; second <= 30; second++) {
      advance(s, 10); // 1 gear per second
      expect(s.inventory["iron-gear-wheel"]).toBe(second);
    }
    s.machines["assembling-machine-1"].enabled = false;
    s.inventory["stone-furnace"] = 10;
    expect(enqueueCraft(s, "burner-mining-drill", 10)).toBeNull(); // 30 gears needed, 30 in storage
    expect(s.queue.every((j) => j.recipe === "burner-mining-drill")).toBe(true);
  });

  it("counts how many crafts are affordable", () => {
    const s = createNewGame();
    expect(maxCraftable(s, "iron-gear-wheel")).toBe(4);
    expect(maxCraftable(s, "burner-mining-drill")).toBe(0);
  });
});
