import { describe, expect, it } from "vitest";
import { ITEM_IDS, TICK_SECONDS } from "./catalog";
import type { MachineId, RecipeId } from "./catalog";
import { runProduction } from "./production";
import { setup } from "./test-utils";
import { advance } from "./simulation";
import type { GameState } from "./types";

const unit = (state: GameState, machine: MachineId, recipe?: RecipeId) =>
  state.report.units.find((u) => u.machine === machine && (!recipe || u.recipe === recipe))!;

const tick = (state: GameState) => runProduction(state, TICK_SECONDS);

/** Power plant: 1 pump, boilers and engines, plus `drills` electric drills on iron. */
const powerPlant = (opts: { pumps?: number; boilers?: number; engines?: number; drills: number; coal?: number }) =>
  setup({
    items: { coal: opts.coal ?? 1000 },
    machines: {
      "offshore-pump": { count: opts.pumps ?? 1 },
      boiler: { count: opts.boilers ?? 1 },
      "steam-engine": { count: opts.engines ?? 2 },
      "electric-mining-drill": { count: opts.drills, allocations: { "mine-iron-ore": 1 } },
    },
  });

describe("basic production", () => {
  it("runs a fuelled burner drill at full speed", () => {
    const s = setup({ items: { coal: 10 }, machines: { "burner-mining-drill": { count: 4, allocations: { "mine-iron-ore": 1 } } } });
    tick(s);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(1); // 4 x 0.25/s
    expect(s.report.rates.coal).toBeCloseTo(-4 * 0.0375);
    expect(unit(s, "burner-mining-drill").limit).toBeNull();
  });

  it("stops a burner drill without coal and blames coal", () => {
    const s = setup({ machines: { "burner-mining-drill": { count: 1, allocations: { "mine-iron-ore": 1 } } } });
    tick(s);
    expect(s.inventory["iron-ore"]).toBe(0);
    expect(unit(s, "burner-mining-drill").limit).toEqual({ resource: "coal", side: "input" });
  });

  it("runs only the chosen % of machines, saving their fuel", () => {
    const s = setup({ items: { coal: 10 }, machines: { "burner-mining-drill": { count: 100, allocations: { "mine-iron-ore": 1 } } } });
    s.machines["burner-mining-drill"].running = 0.5;
    tick(s);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(50 * 0.25);
    expect(s.report.rates.coal).toBeCloseTo(-50 * 0.0375);
    s.machines["burner-mining-drill"].count = 3; // 50% of 3 rounds to 2 whole drills
    tick(s);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(2 * 0.25);
  });

  it("splits capacity by allocation and leaves the rest idle", () => {
    const s = setup({
      items: { coal: 10 },
      machines: { "burner-mining-drill": { count: 4, allocations: { "mine-iron-ore": 0.5, "mine-stone": 0.25 } } },
    });
    tick(s);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(0.5);
    expect(s.report.rates.stone).toBeCloseTo(0.25);
    expect(s.report.rates.coal).toBeCloseTo(-3 * 0.0375); // idle 25% burns nothing
  });

  it("smelts at the ore-limited rate and only burns fuel for that", () => {
    const ore = 0.1; // 3.2s recipe at 1/0.1s needs 0.03125 ore per tick
    const s = setup({ items: { coal: 10, "iron-ore": ore }, machines: { "stone-furnace": { count: 1, allocations: { "iron-plate": 1 } } } });
    tick(s);
    expect(unit(s, "stone-furnace").ratio).toBeCloseTo(1);
    const starved = setup({ items: { coal: 10, "iron-ore": 0.01 }, machines: { "stone-furnace": { count: 1, allocations: { "iron-plate": 1 } } } });
    tick(starved);
    const u = unit(starved, "stone-furnace");
    expect(u.ratio).toBeCloseTo(0.01 / 0.03125);
    expect(u.limit).toEqual({ resource: "iron-ore", side: "input" });
    expect(starved.report.rates.coal).toBeCloseTo((-0.0225 * 0.01) / 0.03125);
  });
});

describe("power chain bottlenecks", () => {
  it("fully powers 20 drills with 1 boiler and 2 engines (1.8 MW)", () => {
    const s = powerPlant({ drills: 20 });
    tick(s);
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(1);
    expect(s.report.rates["iron-ore"]).toBeCloseTo(10);
    expect(s.report.flows.electricity.produced).toBeCloseTo(1800);
  });

  it("browns out proportionally when demand exceeds supply", () => {
    const s = powerPlant({ drills: 40 });
    tick(s);
    const drills = unit(s, "electric-mining-drill");
    expect(drills.ratio).toBeCloseTo(0.5);
    expect(drills.limit).toEqual({ resource: "electricity", side: "input" });
    expect(s.report.rates["iron-ore"]).toBeCloseTo(10);
  });

  it("generates only what is demanded and burns coal accordingly", () => {
    const s = powerPlant({ drills: 5 }); // 450 kW of 1800 kW
    tick(s);
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(1);
    expect(unit(s, "steam-engine").ratio).toBeCloseTo(0.25);
    expect(unit(s, "steam-engine").limit).toEqual({ resource: "electricity", side: "output" });
    expect(unit(s, "boiler").ratio).toBeCloseTo(0.25);
    expect(s.report.rates.coal).toBeCloseTo(-0.45 * 0.25);
  });

  it("propagates a coal shortage from boiler to engines to drills", () => {
    const perTick = 0.45 * TICK_SECONDS;
    const s = powerPlant({ drills: 20, coal: perTick / 4 });
    tick(s);
    expect(unit(s, "boiler").ratio).toBeCloseTo(0.25);
    expect(unit(s, "boiler").limit).toEqual({ resource: "coal", side: "input" });
    expect(unit(s, "steam-engine").limit).toEqual({ resource: "steam", side: "input" });
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(0.25);
    expect(unit(s, "electric-mining-drill").limit).toEqual({ resource: "electricity", side: "input" });
    expect(s.inventory.coal).toBeCloseTo(0);
  });

  it("stops the whole chain without an offshore pump", () => {
    const s = powerPlant({ drills: 10, pumps: 0 });
    tick(s);
    expect(unit(s, "boiler").limit).toEqual({ resource: "water", side: "input" });
    expect(unit(s, "electric-mining-drill").ratio).toBe(0);
    expect(s.inventory["iron-ore"]).toBe(0);
  });

  it("lets one boiler feed two engines (Factorio's 1:2 ratio)", () => {
    const one = powerPlant({ drills: 10, engines: 1 }); // 900 kW of drills on 1 boiler + 1 engine
    tick(one);
    expect(unit(one, "steam-engine").ratio).toBeCloseTo(1);
    expect(unit(one, "boiler").ratio).toBeCloseTo(0.5);
    expect(unit(one, "electric-mining-drill").ratio).toBeCloseTo(1);
    const two = powerPlant({ drills: 20, engines: 2 }); // 1.8 MW: the boiler is now the limit
    tick(two);
    expect(unit(two, "boiler").ratio).toBeCloseTo(1);
    expect(unit(two, "steam-engine").ratio).toBeCloseTo(1);
    const three = powerPlant({ drills: 30, engines: 3 }); // 2.7 MW wanted, 1.8 MW of steam
    tick(three);
    expect(unit(three, "steam-engine").limit).toEqual({ resource: "steam", side: "input" });
    expect(unit(three, "electric-mining-drill").ratio).toBeCloseTo(2 / 3);
  });

  it("reports power demand only for machines that could actually run", () => {
    const s = powerPlant({ drills: 10 });
    s.machines["iron-chest"].count = 0;
    s.inventory["iron-ore"] = 500; // storage full: drills can't run regardless of power
    tick(s);
    expect(s.report.flows.electricity.demand).toBeCloseTo(0);
    const short = powerPlant({ drills: 40 }); // 3.6 MW on 1.8 MW
    tick(short);
    expect(short.report.flows.electricity.demand).toBeCloseTo(3600);
    expect(short.report.flows.electricity.capacity).toBeCloseTo(1800);
  });

  it("adds no output when another drill joins a power-starved grid of drills", () => {
    const before = powerPlant({ drills: 23, engines: 1 }); // 2.07 MW wanted on 900 kW
    const after = powerPlant({ drills: 24, engines: 1 });
    tick(before);
    tick(after);
    expect(after.report.rates["iron-ore"]).toBeCloseTo(before.report.rates["iron-ore"]!, 9);
    expect(after.report.flows.electricity.produced).toBeCloseTo(900);
  });

  it("in a shared brownout, a new consumer's power comes from the others at the same priority", () => {
    const grid = (drills: number) => {
      const s = powerPlant({ drills, engines: 1 });
      s.inventory["iron-plate"] = 1000;
      s.machines["assembling-machine-1"] = { count: 4, enabled: true, running: 1, priority: 0, allocations: { "iron-gear-wheel": 4 }, modules: {} };
      tick(s);
      return s;
    };
    const before = grid(23);
    const after = grid(24);
    expect(after.report.flows.electricity.produced).toBeCloseTo(900); // never more than generated
    // Drills gain a little, assemblers lose the same power: everyone shares one satisfaction ratio.
    expect(after.report.rates["iron-ore"]!).toBeGreaterThan(before.report.rates["iron-ore"]!);
    expect(after.report.rates["iron-gear-wheel"]!).toBeLessThan(before.report.rates["iron-gear-wheel"]!);
    expect(unit(after, "assembling-machine-1").ratio).toBeCloseTo(unit(after, "electric-mining-drill").ratio);
  });

  it("caps power at the engine count", () => {
    const s = powerPlant({ drills: 20, engines: 1 }); // 900 kW for 1800 kW demand
    tick(s);
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(0.5);
    expect(unit(s, "boiler").ratio).toBeCloseTo(0.5);
  });

  it("chains assemblers behind power and plates", () => {
    const s = setup({
      items: { coal: 100, "iron-plate": 100 },
      machines: {
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 1 },
        "assembling-machine-1": { count: 2, allocations: { "iron-gear-wheel": 2 } },
      },
    });
    tick(s);
    expect(s.report.rates["iron-gear-wheel"]).toBeCloseTo(2); // 2 x 0.5 speed / 0.5s
    expect(s.report.rates["iron-plate"]).toBeCloseTo(-4);
  });
});

describe("priorities and sharing", () => {
  it("serves the higher priority consumer first", () => {
    const coal = 0.0375 * TICK_SECONDS * 2; // enough for 2 burner drills
    const s = setup({
      items: { coal },
      machines: {
        "burner-mining-drill": { count: 2, priority: 1, allocations: { "mine-iron-ore": 1 } },
        "stone-furnace": { count: 10, allocations: { "stone-brick": 1 } },
      },
    });
    s.inventory.stone = 100;
    tick(s);
    expect(unit(s, "burner-mining-drill").ratio).toBeCloseTo(1);
    expect(unit(s, "stone-furnace").ratio).toBeCloseTo(0);
  });

  it("splits a shortage proportionally within a priority tier", () => {
    const perTick = 0.0375 * TICK_SECONDS;
    const s = setup({
      items: { coal: perTick },
      machines: { "burner-mining-drill": { count: 2, allocations: { "mine-iron-ore": 0.5, "mine-copper-ore": 0.5 } } },
    });
    tick(s);
    expect(unit(s, "burner-mining-drill", "mine-iron-ore").ratio).toBeCloseTo(0.5);
    expect(unit(s, "burner-mining-drill", "mine-copper-ore").ratio).toBeCloseTo(0.5);
  });

  it("redistributes coal freed by an ore-starved furnace", () => {
    const boilerCoal = 0.45 * TICK_SECONDS;
    const s = setup({
      items: { coal: boilerCoal, "iron-ore": 0 },
      machines: {
        "stone-furnace": { count: 10, allocations: { "iron-plate": 1 } },
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 2 },
        "electric-mining-drill": { count: 20, allocations: { "mine-stone": 1 } },
      },
    });
    tick(s);
    expect(unit(s, "stone-furnace").ratio).toBe(0);
    expect(unit(s, "boiler").ratio).toBeCloseTo(1);
  });
});

describe("chain edge cases", () => {
  it("limits boilers by pump capacity (1 pump feeds 20 boilers)", () => {
    const s = powerPlant({ boilers: 40, engines: 80, drills: 800, coal: 1e6 });
    tick(s);
    expect(unit(s, "boiler").ratio).toBeCloseTo(0.5);
    expect(unit(s, "boiler").limit).toEqual({ resource: "water", side: "input" });
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(0.5);
  });

  it("does not let demand-limited boilers hoard scarce coal from furnaces", () => {
    const furnaceCoal = 10 * 0.0225 * TICK_SECONDS;
    const s = setup({
      items: { coal: furnaceCoal + 0.45 * TICK_SECONDS * 0.1, "iron-ore": 100 },
      machines: {
        "stone-furnace": { count: 10, allocations: { "iron-plate": 1 } },
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 2 },
        "electric-mining-drill": { count: 2, allocations: { "mine-stone": 1 } }, // 180 kW = 10% of a boiler
      },
    });
    tick(s);
    expect(unit(s, "stone-furnace").ratio).toBeCloseTo(1);
    expect(unit(s, "boiler").ratio).toBeCloseTo(0.1);
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(1);
  });

  it("gives power to the higher priority consumer first", () => {
    const s = setup({
      items: { coal: 100, "iron-plate": 100 },
      machines: {
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 1 }, // 900 kW
        "electric-mining-drill": { count: 10, priority: 1, allocations: { "mine-coal": 1 } }, // 900 kW
        "assembling-machine-1": { count: 4, allocations: { "iron-gear-wheel": 4 } },
      },
    });
    tick(s);
    expect(unit(s, "electric-mining-drill").ratio).toBeCloseTo(1);
    expect(unit(s, "assembling-machine-1").ratio).toBeCloseTo(0);
    expect(unit(s, "assembling-machine-1").limit).toEqual({ resource: "electricity", side: "input" });
  });

  it("lets burner drills mining coal sustain themselves", () => {
    const s = setup({ items: { coal: 1 }, machines: { "burner-mining-drill": { count: 3, allocations: { "mine-coal": 1 } } } });
    advance(s, 600);
    expect(s.inventory.coal).toBeCloseTo(1 + 60 * 3 * (0.25 - 0.0375), 0);
  });

  it("runs a large factory tick fast", () => {
    const s = powerPlant({ boilers: 10, engines: 20, drills: 150 });
    s.machines["stone-furnace"] = { count: 50, enabled: true, running: 1, priority: 0, allocations: { "iron-plate": 0.6, "copper-plate": 0.4 }, modules: {} };
    s.machines["assembling-machine-1"] = { count: 30, enabled: true, running: 1, priority: 0, allocations: { "iron-gear-wheel": 9, "copper-cable": 9, "electronic-circuit": 12 }, modules: {} };
    const start = performance.now();
    advance(s, 1000);
    expect((performance.now() - start) / 1000).toBeLessThan(2); // ms per tick
  });
});

describe("whole-machine running", () => {
  it("gives running assemblers to assigned recipes in whole machines", () => {
    const s = setup({
      items: { coal: 100, "iron-plate": 100 },
      machines: {
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 2 },
        "assembling-machine-1": { count: 10, allocations: { "iron-gear-wheel": 2, pipe: 3 } },
      },
    });
    s.machines["assembling-machine-1"].running = 0.6; // 6 run: 2 on gears, 3 on pipes, 1 free one idles
    tick(s);
    expect(unit(s, "assembling-machine-1", "iron-gear-wheel").scale).toBe(2);
    expect(unit(s, "assembling-machine-1", "pipe").scale).toBe(3);
    s.machines["assembling-machine-1"].running = 0.3; // 3 run: both gears, then 1 pipe
    tick(s);
    expect(unit(s, "assembling-machine-1", "iron-gear-wheel").scale).toBe(2);
    expect(unit(s, "assembling-machine-1", "pipe").scale).toBe(1);
  });
});

describe("stock targets", () => {
  it("stops a machine at the target and reports it as a target, not a bottleneck", () => {
    const s = setup({ items: { coal: 10, "iron-ore": 10 }, machines: { "stone-furnace": { count: 1, allocations: { "iron-plate": 1 } } } });
    s.stockTargets["iron-plate"] = 50;
    s.inventory["iron-plate"] = 50;
    tick(s);
    expect(unit(s, "stone-furnace").ratio).toBe(0);
    expect(unit(s, "stone-furnace").limit).toEqual({ resource: "iron-plate", side: "target" });
    s.inventory["iron-plate"] = 49.99;
    tick(s);
    expect(s.inventory["iron-plate"]).toBeCloseTo(50);
  });

  it("only fills up to the target, then tracks consumption", () => {
    const s = setup({
      items: { coal: 100, "iron-plate": 100 },
      machines: {
        "offshore-pump": { count: 1 },
        boiler: { count: 1 },
        "steam-engine": { count: 1 },
        "assembling-machine-1": { count: 3, allocations: { "iron-gear-wheel": 2, "automation-science-pack": 1 } },
      },
    });
    s.inventory["copper-plate"] = 100;
    s.stockTargets["iron-gear-wheel"] = 5;
    advance(s, 600);
    expect(s.inventory["iron-gear-wheel"]).toBeLessThanOrEqual(5 + 1e-6);
    expect(s.report.rates["automation-science-pack"]).toBeCloseTo(0.1); // 1 assembler: 0.5 speed / 5 s
  });
});

describe("storage", () => {
  it("stalls a machine whose output is full and stops its inputs", () => {
    const s = setup({ items: { coal: 10, "iron-ore": 10 }, machines: { "stone-furnace": { count: 1, allocations: { "iron-plate": 1 } } } });
    s.machines["iron-chest"].count = 0;
    s.inventory["iron-plate"] = 1000; // cap is 100 x 10 slots
    tick(s);
    expect(unit(s, "stone-furnace").ratio).toBe(0);
    expect(unit(s, "stone-furnace").limit).toEqual({ resource: "iron-plate", side: "output" });
    expect(s.inventory["iron-ore"]).toBe(10);
    expect(s.inventory.coal).toBe(10);
  });
});

describe("invariants", () => {
  it("never lets inventory go negative in a busy factory", () => {
    const s = setup({
      items: { coal: 5, "iron-ore": 3, "copper-ore": 2, stone: 4, "iron-plate": 6, "copper-plate": 1 },
      machines: {
        "burner-mining-drill": { count: 7, allocations: { "mine-coal": 0.4, "mine-iron-ore": 0.3, "mine-copper-ore": 0.3 } },
        "stone-furnace": { count: 9, priority: 2, allocations: { "iron-plate": 0.5, "copper-plate": 0.3, "stone-brick": 0.2 } },
        "steel-furnace": { count: 2, allocations: { "steel-plate": 1 } },
        "offshore-pump": { count: 1 },
        boiler: { count: 2, priority: -1 },
        "steam-engine": { count: 3 },
        "electric-mining-drill": { count: 12, allocations: { "mine-coal": 0.5, "mine-stone": 0.5 } },
        "assembling-machine-1": { count: 6, allocations: { "copper-cable": 3, "electronic-circuit": 3 } },
      },
    });
    s.machines["iron-chest"].count = 0;
    for (let i = 0; i < 2000; i++) {
      advance(s, 1);
      for (const id of ITEM_IDS) expect(s.inventory[id]).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic", () => {
    const make = () => powerPlant({ drills: 33, coal: 2 });
    const a = make();
    const b = make();
    advance(a, 500);
    advance(b, 500);
    expect(a).toEqual(b);
  });
});
