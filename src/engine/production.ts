import { COAL_FUEL_KJ, entries, isFlow, MACHINE_IDS, MACHINES, RECIPES } from "./catalog";
import type { Amounts, FlowId, ItemId, MachineId, RecipeId, ResourceId } from "./catalog";
import { attackUnit, emptyCombatReport, resolveCombat } from "./combat";
import { dayTime, daylight } from "./daylight";
import { NO_EFFECTS, unitEffects } from "./effects";
import type { Effects } from "./effects";
import { addAmount, capacityOf, machineCapOf, snap } from "./inventory";
import { runningCount } from "./machines";
import { addResearchProgress, currentResearch, labInputs } from "./research";
import { solveProduction } from "./solver";
import type { ProductionUnit } from "./solver";
import type { FlowReport, GameState, Limit, MachineState, TickReport } from "./types";

/** Accumulator stats from Factorio 2.0: 5 MJ stored, 300 kW in and out. */
const ACCUMULATOR_KJ = 5000;
const ACCUMULATOR_KW = 300;
/** Rocket parts per launch (Factorio 2.0 base game). */
const ROCKET_PARTS = 100;

/** Per-second inputs and outputs of one machine running a recipe at full speed. */
const machineRates = (machineId: MachineId, recipeId: RecipeId, effects: Effects = NO_EFFECTS) => {
  const machine = MACHINES[machineId];
  const recipe = RECIPES[recipeId];
  const craftsPerSecond = (machine.speed * effects.speed) / recipe.time;
  const inputs: Amounts = {};
  const outputs: Amounts = {};
  for (const [id, n] of entries(recipe.ingredients)) addAmount(inputs, id, n * craftsPerSecond);
  for (const [id, n] of entries(recipe.results)) addAmount(outputs, id, n * craftsPerSecond * effects.output);
  const kw = (machine.energy?.kw ?? 0) * effects.consumption;
  if (machine.energy?.kind === "burner") addAmount(inputs, "coal", kw / COAL_FUEL_KJ);
  if (machine.energy?.kind === "electric") addAmount(inputs, "electricity", kw);
  return { inputs, outputs };
};

/**
 * Every configured recipe (including 0% rows) with the machines running it, after the
 * "running %" setting. Whole-machine types hand running machines to assigned recipes in
 * order, so a recipe never runs a fraction of a machine; percentage types split them.
 */
const recipeScales = (machineId: MachineId, machine: MachineState): Array<[RecipeId, number]> => {
  const def = MACHINES[machineId];
  const running = runningCount(machine);
  if (def.fixedRecipe) return [[def.fixedRecipe, running]];
  const allocations = Object.entries(machine.allocations) as Array<[RecipeId, number]>;
  if (!def.wholeMachines) return allocations.map(([recipe, share]) => [recipe, running * share]);
  let left = running;
  return allocations.map(([recipe, assigned]) => {
    const scale = Math.min(assigned, left);
    left -= scale;
    return [recipe, scale];
  });
};

const scaled = (amounts: Amounts, factor: number) =>
  entries(amounts).map(([id, n]): [ResourceId, number] => [id, n * factor]);

/** A production unit plus what research needs: labs' speed and productivity. */
interface MachineUnit extends ProductionUnit {
  effects: Effects;
}

const buildUnits = (state: GameState): MachineUnit[] =>
  MACHINE_IDS.flatMap((machineId) => {
    const machine = state.machines[machineId];
    if (!machine.enabled || machine.count <= 0) return [];
    const def = MACHINES[machineId];
    return recipeScales(machineId, machine).flatMap(([recipe, scale]): MachineUnit[] => {
      if (scale <= 0) return [];
      const effects = unitEffects(state, machineId, recipe);
      const { inputs, outputs } = machineRates(machineId, recipe, effects);
      if (recipe === "research") {
        // Labs idle (and draw no power) without a research to work on.
        const packs = labInputs(state);
        if (!packs) return [];
        for (const [id, n] of entries(packs)) addAmount(inputs, id, n * def.speed * effects.speed);
      }
      const priority = def.fixedPriority ?? machine.priority;
      return [{ machine: machineId, recipe, priority, scale, effects, inputs: scaled(inputs, scale), outputs: scaled(outputs, scale) }];
    });
  });

/**
 * Accumulators as two lowest-priority units: one charges from power nobody else wants, one
 * discharges into shortfalls. When generation falls short, the discharge unit also feeds the
 * charge unit; only the net flow matters, so that loop is harmless.
 */
const accumulatorUnits = (state: GameState, dt: number): ProductionUnit[] => {
  const { count, enabled } = state.machines.accumulator;
  if (!enabled || count <= 0) return [];
  const priority = MACHINES.accumulator.fixedPriority!;
  const rate = count * ACCUMULATOR_KW;
  const charge = Math.min(rate, (count * ACCUMULATOR_KJ - state.storedEnergy) / dt);
  const discharge = Math.min(rate, state.storedEnergy / dt);
  const unit = (inputs: ProductionUnit["inputs"], outputs: ProductionUnit["outputs"]): ProductionUnit => ({
    machine: "accumulator",
    recipe: "generate-electricity",
    priority,
    scale: count,
    inputs,
    outputs,
  });
  return [unit([["electricity", Math.max(0, charge)]], []), unit([], [["electricity", Math.max(0, discharge)]])];
};

const emptyFlows = (): Record<FlowId, FlowReport> => ({
  water: { produced: 0, capacity: 0, demand: 0 },
  steam: { produced: 0, capacity: 0, demand: 0 },
  electricity: { produced: 0, capacity: 0, demand: 0 },
  firepower: { produced: 0, capacity: 0, demand: 0 },
  pollution: { produced: 0, capacity: 0, demand: 0 },
});

const emptyReport = (): TickReport => ({
  units: [],
  flows: emptyFlows(),
  power: { daylight: 1, accumulatorFlow: 0 },
  combat: emptyCombatReport(),
  rates: {},
});

/** An output limit caused by the player's stock target rather than the storage cap. */
const targetLimit = (state: GameState, limit: Limit | null): Limit | null => {
  if (!limit || limit.side !== "output" || isFlow(limit.resource)) return limit;
  const item = limit.resource as ItemId;
  const target = state.stockTargets[item];
  return target !== undefined && target < capacityOf(state, item) ? { ...limit, side: "target" } : limit;
};

/** Research units per second a lab unit makes at full speed. */
const researchRate = (unit: Pick<MachineUnit, "scale" | "machine" | "effects">, time: number) =>
  (unit.scale * MACHINES[unit.machine].speed * unit.effects.speed * unit.effects.output) / time;

/** Launches a rocket once the silo has all its parts. The first launch wins the game. */
const launchRockets = (state: GameState) => {
  if (state.inventory["rocket-part"] < ROCKET_PARTS) return;
  state.inventory["rocket-part"] = snap(state.inventory["rocket-part"] - ROCKET_PARTS);
  const { launches, firstLaunchTick } = state.rocket;
  state.rocket = { ...state.rocket, launches: launches + 1, firstLaunchTick: firstLaunchTick ?? state.tick };
};

/** Runs every machine for `dt` seconds, never letting an item go negative or over its cap. */
const runProduction = (state: GameState, dt: number) => {
  const units = buildUnits(state);
  const accumulators = accumulatorUnits(state, dt);
  const { unit: attack, byHand } = attackUnit(state, dt);
  const { ratios, demands, limits } = solveProduction({
    units: [...units, ...accumulators, ...(attack ? [attack] : [])],
    stock: (item) => state.inventory[item],
    space: (item) => machineCapOf(state, item) - state.inventory[item],
    dt,
  });

  const flows = emptyFlows();
  const rates: Amounts = {};
  const { produced, consumed } = state.stats.pending;

  // All consumption first: the solver sized it against start-of-tick stock.
  units.forEach((unit, i) => {
    for (const [id, perSecond] of unit.inputs) {
      let used = perSecond * ratios[i]! * dt;
      if (isFlow(id)) flows[id].demand += perSecond * demands[i]!;
      else {
        used = Math.min(used, state.inventory[id as ItemId]);
        state.inventory[id as ItemId] = snap(state.inventory[id as ItemId] - used);
      }
      addAmount(rates, id, -used / dt);
      addAmount(consumed, id, used);
    }
  });
  units.forEach((unit, i) => {
    for (const [id, perSecond] of unit.outputs) {
      const made = perSecond * ratios[i]! * dt;
      if (isFlow(id)) {
        flows[id].capacity += perSecond;
        flows[id].produced += made / dt;
      } else state.inventory[id as ItemId] = snap(state.inventory[id as ItemId] + made);
      addAmount(rates, id, made / dt);
      addAmount(produced, id, made);
      addAmount(state.stats.lifetime, id, made);
    }
  });

  let accumulatorFlow = 0;
  accumulators.forEach((unit, j) => {
    const ratio = ratios[units.length + j]!;
    for (const [, kw] of unit.inputs) accumulatorFlow += kw * ratio;
    for (const [, kw] of unit.outputs) accumulatorFlow -= kw * ratio;
  });
  state.storedEnergy = snap(Math.max(0, state.storedEnergy + accumulatorFlow * dt));

  // Pollution follows energy use, so idle machines emit nothing (as in Factorio).
  const emissions: Partial<Record<MachineId, number>> = {};
  units.forEach((u, i) => {
    const perMinute = MACHINES[u.machine].pollution ?? 0;
    if (perMinute > 0) addAmount(emissions, u.machine, (perMinute / 60) * ratios[i]! * u.scale * u.effects.consumption * u.effects.pollution);
  });
  const emitted = Object.values(emissions).reduce((sum, n) => sum + n, 0);
  addAmount(produced, "pollution", emitted * dt);
  addAmount(state.stats.lifetime, "pollution", emitted * dt);
  flows.pollution.produced = emitted;
  const killed = attack ? ratios[units.length + accumulators.length]! : 1;
  const combat = resolveCombat(state, killed, byHand, emitted, emissions, dt);
  flows.firepower.demand = combat.threat;

  const tech = currentResearch(state);
  if (tech?.cost.kind === "research") {
    const time = tech.cost.time;
    const work = units.reduce((sum, u, i) => (u.recipe === "research" ? sum + researchRate(u, time) * ratios[i]! * dt : sum), 0);
    addResearchProgress(state, work);
  }

  launchRockets(state);

  state.report = {
    units: units.map((u, i) => ({
      machine: u.machine,
      recipe: u.recipe,
      ratio: ratios[i]!,
      scale: u.scale,
      demand: demands[i]!,
      limit: targetLimit(state, limits[i]!),
    })),
    flows,
    power: { daylight: daylight(dayTime(state.tick)), accumulatorFlow },
    combat,
    rates,
  };
};

export { ACCUMULATOR_KJ, ACCUMULATOR_KW, buildUnits, emptyReport, machineRates, recipeScales, researchRate, ROCKET_PARTS, runProduction };
