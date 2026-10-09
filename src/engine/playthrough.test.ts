import { describe, expect, it } from "vitest";
import { MANUAL_MINING_RATE, TICKS_PER_SECOND } from "./catalog";
import type { MachineId, OreId, RecipeId } from "./catalog";
import { enqueueCraft } from "./crafting";
import { produceCapped } from "./inventory";
import { addAllocation, assignMachines, setAllocation } from "./machines";
import { advance, createNewGame } from "./simulation";
import type { GameState } from "./types";
import { queueResearch, techStatus } from "./research";
import { isUnlocked } from "./unlocks";

/** Plays a fresh game with only player actions, checking it reaches a stable powered factory. */
describe("playthrough from a new game", () => {
  const s: GameState = createNewGame();
  let seconds = 0;
  const wait = (secs: number) => {
    advance(s, secs * TICKS_PER_SECOND);
    seconds += secs;
  };
  const handMine = (ore: OreId, amount: number) => {
    for (let i = 0; i < amount; i++) produceCapped(s, ore, 1);
    wait(amount / MANUAL_MINING_RATE);
  };
  const build = (recipe: RecipeId, count = 1) => {
    expect(enqueueCraft(s, recipe, count)).toBeNull();
    while (s.queue.length > 0) wait(1);
  };
  const allocate = (machine: MachineId, shares: Partial<Record<RecipeId, number>>) => {
    s.machines[machine].allocations = {};
    for (const [recipe, share] of Object.entries(shares) as Array<[RecipeId, number]>) {
      addAllocation(s, machine, recipe);
      setAllocation(s, machine, recipe, share);
    }
  };
  /** Waits until a condition holds, failing if it takes unreasonably long. */
  const waitFor = (done: () => boolean, maxSeconds: number) => {
    for (let t = 0; t < maxSeconds && !done(); t += 5) wait(5);
    expect(done()).toBe(true);
  };

  const plates = (iron: number, copper = 0) => () => s.inventory["iron-plate"] >= iron && s.inventory["copper-plate"] >= copper;

  it("bootstraps burner mining and smelting", () => {
    handMine("coal", 30);
    allocate("burner-mining-drill", { "mine-coal": 0.5, "mine-iron-ore": 0.5 });
    handMine("iron-ore", 30);
    allocate("stone-furnace", { "iron-plate": 1 });
    handMine("stone", 20);
    build("stone-furnace", 3);
    waitFor(plates(30), 600);
    handMine("stone", 10);
    build("burner-mining-drill", 2);
    allocate("burner-mining-drill", { "mine-coal": 0.34, "mine-iron-ore": 0.33, "mine-copper-ore": 0.33 });
    allocate("stone-furnace", { "iron-plate": 0.6, "copper-plate": 0.4 });
  });

  it("unlocks Steam power and Electronics by producing plates", () => {
    for (let i = 0; i < 6; i++) {
      waitFor(plates(9), 600);
      handMine("stone", 5);
      build("burner-mining-drill");
    }
    allocate("burner-mining-drill", { "mine-coal": 0.3, "mine-iron-ore": 0.4, "mine-copper-ore": 0.2, "mine-stone": 0.1 });
    waitFor(() => techStatus(s, "steam-power") === "researched" && techStatus(s, "electronics") === "researched", 1200);
    expect(isUnlocked(s, "boiler")).toBe(true);
    expect(isUnlocked(s, "lab")).toBe(true);
  });

  it("builds steam power and a lab, then researches Automation", () => {
    waitFor(plates(80, 10), 1800);
    build("offshore-pump");
    build("boiler");
    build("steam-engine");
    waitFor(plates(40, 15), 1800);
    build("lab");
    expect(isUnlocked(s, "automation-science-pack")).toBe(true);
    waitFor(plates(20, 10), 1800);
    build("automation-science-pack", 10);
    queueResearch(s, "automation");
    waitFor(() => techStatus(s, "automation") === "researched", 600);
    expect(isUnlocked(s, "assembling-machine-1")).toBe(true);
  });

  it("automates red science into a stable research loop", () => {
    waitFor(plates(50, 10), 1800);
    build("assembling-machine-1", 2);
    assignMachines(s, "assembling-machine-1", "iron-gear-wheel", 1);
    assignMachines(s, "assembling-machine-1", "automation-science-pack", 1);
    s.stockTargets["iron-gear-wheel"] = 20; // don't let gears eat every plate
    queueResearch(s, "electric-mining-drill");
    wait(120);

    const unit = (machine: MachineId) => s.report.units.find((u) => u.machine === machine);
    expect(unit("lab")?.ratio ?? 0).toBeGreaterThan(0);
    expect(s.research.progress["electric-mining-drill"] ?? 0).toBeGreaterThan(0);
    expect(s.stats.lifetime["automation-science-pack"]).toBeGreaterThan(10); // assembler made more than the hand-crafted 10
    expect(s.report.flows.electricity.produced).toBeGreaterThan(0);
    waitFor(() => techStatus(s, "electric-mining-drill") === "researched", 3600);
    // Under 2 hours of play time to get here.
    expect(seconds).toBeLessThan(7200);
  });
});
