import { describe, expect, it } from "vitest";
import { MACHINE_IDS, MACHINES, RECIPE_IDS, RECIPES, TICK_SECONDS } from "./catalog";
import type { RecipeId } from "./catalog";
import { enqueueCraft } from "./crafting";
import { DAY_SECONDS, daylight } from "./daylight";
import { capacityOf } from "./inventory";
import { setModules } from "./machines";
import { ACCUMULATOR_KJ, runProduction } from "./production";
import { advance } from "./simulation";
import { TECH_IDS, TECHNOLOGIES } from "./technologies";
import type { TechId } from "./technologies";
import { setup } from "./test-utils";
import type { GameState } from "./types";
import { INITIAL_UNLOCKS } from "./unlocks";

const tick = (state: GameState) => runProduction(state, TICK_SECONDS);
const unit = (state: GameState, recipe: RecipeId) => state.report.units.find((u) => u.recipe === recipe)!;
const research = (state: GameState, ...ids: TechId[]) => {
  state.research.researched.push(...ids);
  for (const id of ids) state.unlocked.push(...TECHNOLOGIES[id].unlocks);
};
const ticksAt = (dayFraction: number) => Math.round((dayFraction * DAY_SECONDS) / TICK_SECONDS);

describe("tech tree", () => {
  it("only references known technologies and has no cycles", () => {
    const visiting = new Set<TechId>();
    const visit = (id: TechId) => {
      expect(visiting.has(id), `cycle through ${id}`).toBe(false);
      visiting.add(id);
      for (const p of TECHNOLOGIES[id].prerequisites) {
        expect(TECH_IDS).toContain(p);
        visit(p);
      }
      visiting.delete(id);
    };
    TECH_IDS.forEach(visit);
  });

  it("unlocks every recipe and building somewhere", () => {
    const unlockable = new Set([...INITIAL_UNLOCKS, ...TECH_IDS.flatMap((id) => TECHNOLOGIES[id].unlocks)]);
    // Machines' own recipes (water, steam, electricity, research) come with the machine.
    const fixed = new Set(MACHINE_IDS.map((id) => MACHINES[id].fixedRecipe));
    // The biter attack is an internal solver recipe.
    const missing = RECIPE_IDS.filter((id) => !unlockable.has(id) && !fixed.has(id) && RECIPES[id].category !== "combat");
    expect(missing).toEqual([]);
  });

  it("never needs a science pack before a prerequisite unlocks it", () => {
    const ancestors = (id: TechId): TechId[] => TECHNOLOGIES[id].prerequisites.flatMap((p) => [p, ...ancestors(p)]);
    for (const id of TECH_IDS) {
      const cost = TECHNOLOGIES[id].cost;
      if (cost.kind !== "research") continue;
      const unlocked = new Set(ancestors(id).flatMap((t) => TECHNOLOGIES[t].unlocks));
      for (const pack of cost.packs) expect(unlocked.has(pack), `${id} needs ${pack}`).toBe(true);
    }
  });
});

describe("solar power and the day/night cycle", () => {
  it("follows the Nauvis light curve and averages 70%", () => {
    expect(daylight(0)).toBe(1);
    expect(daylight(0.5)).toBe(0);
    expect(daylight(0.35)).toBeCloseTo(0.5);
    const samples = 1000;
    const average = Array.from({ length: samples }, (_, i) => daylight(i / samples)).reduce((a, b) => a + b, 0) / samples;
    expect(average).toBeCloseTo(0.7, 2);
  });

  it("powers machines by day only, before burning coal in steam engines", () => {
    const s = setup({
      items: { coal: 100 },
      machines: {
        "solar-panel": { count: 3 }, // 180 kW at noon
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 2 },
        "electric-mining-drill": { count: 2, allocations: { "mine-iron-ore": 1 } }, // 180 kW
      },
    });
    tick(s);
    expect(s.report.flows.electricity.produced).toBeCloseTo(180);
    expect(unit(s, "generate-electricity").ratio).toBeCloseTo(0);
    expect(s.inventory.coal).toBe(100);

    s.tick = ticksAt(0.5); // midnight
    tick(s);
    expect(s.report.power.daylight).toBe(0);
    expect(unit(s, "generate-electricity").ratio).toBeCloseTo(180 / 1800);
    expect(unit(s, "mine-iron-ore").ratio).toBeCloseTo(1);
  });
});

describe("accumulators", () => {
  const grid = (accumulators: number, engines: number, drills: number) =>
    setup({
      items: { coal: 1000 },
      machines: {
        accumulator: { count: accumulators },
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: engines },
        "electric-mining-drill": { count: drills, allocations: { "mine-iron-ore": 1 } },
      },
    });

  it("charge from spare generation, up to 300 kW each and their capacity", () => {
    const s = grid(2, 2, 1); // 1.8 MW capacity, 90 kW used
    tick(s);
    expect(s.report.power.accumulatorFlow).toBeCloseTo(600);
    expect(s.storedEnergy).toBeCloseTo(60);
    expect(s.report.flows.electricity.produced).toBeCloseTo(690);
    for (let i = 0; i < 1000; i++) tick(s);
    expect(s.storedEnergy).toBeCloseTo(2 * ACCUMULATOR_KJ);
  });

  it("cover a shortfall, then run dry", () => {
    const s = grid(1, 0, 2); // no generation, 180 kW of drills
    s.storedEnergy = 100;
    tick(s);
    expect(unit(s, "mine-iron-ore").ratio).toBeCloseTo(1);
    expect(s.report.power.accumulatorFlow).toBeCloseTo(-180);
    expect(s.storedEnergy).toBeCloseTo(82);
    for (let i = 0; i < 10; i++) tick(s);
    expect(s.storedEnergy).toBe(0);
    expect(unit(s, "mine-iron-ore").ratio).toBe(0);
  });

  it("make up the difference when generation is short, without charging themselves", () => {
    const s = grid(1, 0, 2);
    s.machines["solar-panel"].count = 1; // 60 of the 180 kW needed
    s.storedEnergy = 1000;
    tick(s);
    expect(unit(s, "mine-iron-ore").ratio).toBeCloseTo(1);
    expect(s.report.power.accumulatorFlow).toBeCloseTo(-120);
  });
});

describe("modules and research bonuses", () => {
  const drills = () => {
    const s = setup({
      items: { coal: 1000, "speed-module": 5, "productivity-module": 5 },
      machines: {
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 2 },
        "electric-mining-drill": { count: 2, allocations: { "mine-iron-ore": 1 } },
      },
    });
    research(s, "speed-module", "productivity-module");
    return s;
  };

  it("install from storage, limited by slots", () => {
    const s = drills();
    setModules(s, "electric-mining-drill", "speed-module", 10);
    expect(s.machines["electric-mining-drill"].modules["speed-module"]).toBe(5);
    expect(s.inventory["speed-module"]).toBe(0);
    setModules(s, "electric-mining-drill", "productivity-module", 5);
    expect(s.machines["electric-mining-drill"].modules["productivity-module"]).toBe(1); // 6 slots on 2 drills
    setModules(s, "electric-mining-drill", "speed-module", 0);
    expect(s.inventory["speed-module"]).toBe(5);
  });

  it("change speed, output and power like Factorio's", () => {
    const s = drills();
    setModules(s, "electric-mining-drill", "speed-module", 2); // one per drill: +20% speed, +50% power
    tick(s);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(2 * 0.5 * 1.2);
    expect(s.report.flows.electricity.produced).toBeCloseTo(2 * 90 * 1.5);

    setModules(s, "electric-mining-drill", "speed-module", 0);
    setModules(s, "electric-mining-drill", "productivity-module", 2); // +4% output, -5% speed
    research(s, "mining-productivity-1"); // +10% output
    tick(s);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(2 * 0.5 * 0.95 * 1.14);
  });

  it("speed up labs with research speed", () => {
    const s = setup({
      items: { coal: 1000, "automation-science-pack": 100 },
      machines: { "offshore-pump": { count: 1 }, boiler: { count: 1 }, "steam-engine": { count: 2 }, lab: { count: 1 } },
    });
    research(s, "steam-power", "electronics", "automation-science-pack", "research-speed-1");
    s.research.queue.push("automation");
    tick(s);
    // 10 s per unit at lab speed 1.2: 0.12 units per second.
    expect(s.research.progress.automation).toBeCloseTo(0.12 * TICK_SECONDS);
  });
});

describe("oil and fluids", () => {
  it("stores fluids in tanks, not chest slots", () => {
    const s = setup({ machines: { "storage-tank": { count: 2 } } });
    expect(capacityOf(s, "petroleum-gas")).toBe(51000);
    s.machines["iron-chest"].count = 1000;
    expect(capacityOf(s, "petroleum-gas")).toBe(51000);
  });

  it("stalls advanced oil processing when heavy oil has nowhere to go", () => {
    const s = setup({
      items: { coal: 1000, "crude-oil": 1000, "heavy-oil": 1000 }, // heavy oil at its 1000 cap
      machines: {
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 2 },
        "oil-refinery": { count: 1, allocations: { "advanced-oil-processing": 1 } },
      },
    });
    tick(s);
    expect(unit(s, "advanced-oil-processing").ratio).toBe(0);
    expect(unit(s, "advanced-oil-processing").limit).toEqual({ resource: "heavy-oil", side: "output" });
    s.inventory["heavy-oil"] = 0;
    tick(s);
    expect(s.report.rates["petroleum-gas"]).toBeCloseTo(55 / 5);
  });

  it("keeps fluid recipes off assembler 1 and hand crafting", () => {
    expect(MACHINES["assembling-machine-1"].categories).not.toContain(RECIPES["processing-unit"].category);
    expect(MACHINES["assembling-machine-2"].categories).toContain(RECIPES["processing-unit"].category);
    const s = setup({ items: { "steel-plate": 10, "iron-gear-wheel": 10, pipe: 20 } });
    research(s, "engine");
    expect(enqueueCraft(s, "engine-unit")).toEqual({ "engine-unit": 1 });
  });
});

describe("buildings in storage", () => {
  it("are placed by Build before anything is crafted", () => {
    const s = setup({ items: { "electric-furnace": 2 } });
    research(s, "advanced-material-processing-2");
    expect(enqueueCraft(s, "electric-furnace", 2)).toBeNull();
    expect(s.machines["electric-furnace"].count).toBe(2);
    expect(s.inventory["electric-furnace"]).toBe(0);
    expect(s.queue).toEqual([]);
  });
});

describe("rocket launch", () => {
  it("launches after 100 parts and records the win", () => {
    const s = setup({
      items: { "processing-unit": 1000, "low-density-structure": 1000, "rocket-fuel": 20 },
      machines: { "solar-panel": { count: 100 }, "rocket-silo": { count: 1 } },
    });
    s.inventory["rocket-part"] = 99;
    advance(s, 40); // one part takes 3 s
    expect(s.rocket.launches).toBe(1);
    expect(s.rocket.firstLaunchTick).not.toBeNull();
    expect(s.inventory["rocket-part"]).toBeLessThan(1); // the silo starts on the next rocket
  });
});
