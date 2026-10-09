import { COAL_FUEL_KJ, isFlow, MACHINE_IDS, MACHINES, mainResult, RESOURCES } from "../engine/catalog";
import type { MachineId, RecipeId, ResourceId } from "../engine/catalog";
import { machineEffects, unitEffects } from "../engine/effects";
import { machineRates, recipeScales } from "../engine/production";
import type { GameState, Limit, UnitReport } from "../engine/types";
import type { Tone } from "./design/chip";
import { formatRatePair } from "./format-utils";

interface UnitView {
  recipe: RecipeId;
  /** As configured: fraction of capacity for percentage machines, assigned count for whole-machine ones. */
  share: number;
  /** Actual speed as a fraction of potential. */
  ratio: number;
  limit: Limit | null;
  product: ResourceId;
  /** Per second at full speed for this allocation. */
  potential: number;
  actual: number;
}

const findUnit = (state: GameState, machine: MachineId, recipe: RecipeId): UnitReport | undefined =>
  state.report.units.find((u) => u.machine === machine && u.recipe === recipe);

/**
 * Views per state object: every tick makes a new state, and the many selectors reading the same
 * machine type in one tick (e.g. each product row) share one computation.
 */
const viewCache = new WeakMap<GameState, Map<MachineId, UnitView[]>>();

/** One view per configured recipe (fixed-recipe machines have exactly one). */
const unitViews = (state: GameState, machineId: MachineId): UnitView[] => {
  let cached = viewCache.get(state);
  if (!cached) viewCache.set(state, (cached = new Map()));
  let views = cached.get(machineId);
  if (!views) cached.set(machineId, (views = computeUnitViews(state, machineId)));
  return views;
};

const computeUnitViews = (state: GameState, machineId: MachineId): UnitView[] => {
  const machine = state.machines[machineId];
  const fixed = MACHINES[machineId].fixedRecipe;
  // Labs have no output item; research progress is shown by LabStatus instead.
  return recipeScales(machineId, machine)
    .filter(([recipe]) => recipe !== "research")
    .map(([recipe, scale]) => {
      const product = mainResult(recipe);
      const potential = (machineRates(machineId, recipe, unitEffects(state, machineId, recipe)).outputs[product] ?? 0) * scale;
      const unit = findUnit(state, machineId, recipe);
      const ratio = unit && machine.enabled ? unit.ratio : 0;
      const share = fixed ? 1 : (machine.allocations[recipe] ?? 0);
      return { recipe, share, ratio, limit: unit?.limit ?? null, product, potential, actual: potential * ratio };
    });
};

/** What a unit view looks like on screen; views with the same key render the same. */
const viewKey = (view: UnitView | null) =>
  view ? `${view.recipe}|${formatRatePair(view.product, view.actual, view.potential)}|${view.ratio.toFixed(3)}|${view.limit?.resource}|${view.limit?.side}` : "";

/** Equality for selectors returning a view: re-render only when the display changes, not every tick. */
const sameView = (a: UnitView | null, b: UnitView | null) => viewKey(a) === viewKey(b);

const sameViews = (a: UnitView[], b: UnitView[]) => a.length === b.length && a.every((view, i) => sameView(view, b[i]!));

/** Fuel or power use of a machine type this tick: actual and at full speed, per second. Idle capacity uses none. */
const energyUse = (state: GameState, machineId: MachineId) => {
  const energy = MACHINES[machineId].energy;
  if (!energy) return null;
  const resource: ResourceId = energy.kind === "burner" ? "coal" : "electricity";
  const kw = energy.kw * machineEffects(state, machineId).consumption;
  const perMachine = energy.kind === "burner" ? kw / COAL_FUEL_KJ : kw;
  const units = state.report.units.filter((u) => u.machine === machineId);
  return {
    resource,
    actual: units.reduce((sum, u) => sum + u.ratio * u.scale * perMachine, 0),
    potential: units.reduce((sum, u) => sum + u.scale * perMachine, 0),
    /** What it would use with unlimited fuel or power (still bound by items and storage). */
    demanded: units.reduce((sum, u) => sum + u.demand * u.scale * perMachine, 0),
    starved: units.some((u) => u.limit?.side === "input" && u.limit.resource === resource),
  };
};

/** Power used and demanded per electric machine type, biggest consumer first. */
const powerBreakdown = (state: GameState) =>
  MACHINE_IDS.filter((id) => MACHINES[id].energy?.kind === "electric")
    .map((id) => ({ id, ...energyUse(state, id)! }))
    .filter((row) => row.actual > 0 || row.demanded > 0)
    .sort((a, b) => b.actual - a.actual || b.demanded - a.demanded);

/** Short label, tone, and a one-line explanation of what to do about a limit. */
const describeLimit = (limit: Limit): { text: string; tone: Tone; detail: string } => {
  const name = RESOURCES[limit.resource].name;
  const lower = name.toLowerCase();
  if (limit.side === "target")
    return { text: "Stock target reached", tone: "neutral", detail: `Paused at the ${lower} stock target you set. Raise or clear the target to keep producing.` };
  if (limit.side === "output" && limit.resource === "firepower")
    return { text: "No biters to shoot", tone: "neutral", detail: "Turrets only shoot, and use ammo or power, while biters attack." };
  if (limit.side === "output")
    return isFlow(limit.resource)
      ? { text: "Low demand", tone: "neutral", detail: `Nothing needs more ${lower} right now, so these idle until demand rises. Not a problem.` }
      : {
          text: `${name} storage full`,
          tone: "warn",
          detail: `There is no room left for ${lower}. Use it up or build ${RESOURCES[limit.resource].kind === "fluid" ? "storage tanks" : "chests"}.`,
        };
  if (limit.resource === "electricity")
    return {
      text: "Low power",
      tone: "bad",
      detail: "Power demand is higher than generation. Build more steam engines, boilers or solar panels, or check their water and coal.",
    };
  if (limit.resource === "coal")
    return { text: "Low on coal", tone: "bad", detail: "Not enough coal for fuel. Mine more coal, or raise this machine's priority." };
  if (isFlow(limit.resource))
    return { text: `Low ${lower}`, tone: "bad", detail: `Not enough ${lower} from upstream. Check the machines that make it.` };
  return { text: `Waiting for ${lower}`, tone: "warn", detail: `Not enough ${lower} in storage. Make more, or raise this machine's priority over other consumers.` };
};

export { describeLimit, energyUse, powerBreakdown, sameView, sameViews, unitViews };
export type { UnitView };
