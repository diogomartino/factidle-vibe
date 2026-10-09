import { describe, expect, it } from "vitest";
import { assignMachines, setStockTarget } from "./machines";
import { createNewGame } from "./simulation";

describe("whole-machine assignment", () => {
  const setup = () => {
    const s = createNewGame();
    s.machines["assembling-machine-1"].count = 5;
    s.unlocked.push("assembling-machine-1", "electronic-circuit", "copper-cable");
    return s;
  };

  it("never assigns more machines than are owned and free", () => {
    const s = setup();
    assignMachines(s, "assembling-machine-1", "iron-gear-wheel", 3);
    assignMachines(s, "assembling-machine-1", "copper-cable", 9);
    expect(s.machines["assembling-machine-1"].allocations).toEqual({ "iron-gear-wheel": 3, "copper-cable": 2 });
  });

  it("removes the recipe at zero and ignores locked or foreign recipes", () => {
    const s = setup();
    assignMachines(s, "assembling-machine-1", "iron-gear-wheel", 2);
    assignMachines(s, "assembling-machine-1", "iron-gear-wheel", 0);
    assignMachines(s, "assembling-machine-1", "logistic-science-pack", 1); // locked
    assignMachines(s, "assembling-machine-1", "iron-plate", 1); // smelting, not crafting
    expect(s.machines["assembling-machine-1"].allocations).toEqual({});
  });

  it("sets and clears stock targets", () => {
    const s = createNewGame();
    setStockTarget(s, "iron-gear-wheel", 99.7);
    expect(s.stockTargets["iron-gear-wheel"]).toBe(99);
    setStockTarget(s, "iron-gear-wheel", null);
    expect(s.stockTargets).toEqual({});
  });
});
