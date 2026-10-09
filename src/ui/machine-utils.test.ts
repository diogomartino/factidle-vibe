import { describe, expect, it } from "vitest";
import { ITEM_IDS, MACHINE_IDS } from "../engine/catalog";
import type { MachineId, RecipeId } from "../engine/catalog";
import { runProduction } from "../engine/production";
import { createNewGame } from "../engine/simulation";
import { powerBreakdown } from "./machine-utils";

describe("power breakdown", () => {
  it("splits used and demanded power by machine type during a brownout", () => {
    const s = createNewGame();
    for (const id of ITEM_IDS) s.inventory[id] = 0;
    s.inventory.coal = 1000;
    s.inventory["iron-plate"] = 1000;
    const set = (id: MachineId, count: number, allocations: Partial<Record<RecipeId, number>> = {}) => {
      s.machines[id] = { count, enabled: true, running: 1, priority: 0, allocations, modules: {} };
    };
    for (const id of MACHINE_IDS) set(id, 0);
    set("iron-chest", 100);
    set("offshore-pump", 1);
    set("boiler", 1);
    set("steam-engine", 1); // 900 kW
    set("electric-mining-drill", 10, { "mine-iron-ore": 1 }); // 900 kW wanted
    set("assembling-machine-1", 4, { "iron-gear-wheel": 4 }); // 300 kW wanted
    runProduction(s, 0.1);

    const rows = powerBreakdown(s);
    expect(rows.map((r) => r.id)).toEqual(["electric-mining-drill", "assembling-machine-1"]);
    expect(rows[0]!.demanded).toBeCloseTo(900);
    expect(rows[1]!.demanded).toBeCloseTo(300);
    expect(rows.reduce((sum, r) => sum + r.actual, 0)).toBeCloseTo(900); // everything generated, nothing more
    expect(rows[0]!.actual / rows[0]!.demanded).toBeCloseTo(0.75); // same satisfaction for both
    expect(rows[1]!.actual / rows[1]!.demanded).toBeCloseTo(0.75);
  });
});
