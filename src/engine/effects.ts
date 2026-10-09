import { MACHINES, MODULES, RECIPES } from "./catalog";
import type { MachineId, ModuleId, RecipeId } from "./catalog";
import { dayTime, daylight } from "./daylight";
import { healthPerShot } from "./combat";
import { techBonus } from "./research";
import type { TechBonus } from "./technologies";
import type { GameState } from "./types";

/** Multipliers for one machine type running one recipe (1 = unchanged). */
interface Effects {
  /** Crafting speed. */
  speed: number;
  /** Energy use (fuel or power). */
  consumption: number;
  /** Results per craft: productivity, daylight for solar panels, or biter health per shot for turrets. */
  output: number;
  /** Pollution, on top of energy use. */
  pollution: number;
}

const NO_EFFECTS: Effects = { speed: 1, consumption: 1, output: 1, pollution: 1 };

/** Research that speeds up a machine type: labs, and turrets' shooting speed. */
const RESEARCH_SPEED_BONUS: Partial<Record<MachineId, TechBonus>> = { lab: "labSpeed", "gun-turret": "bulletSpeed", "laser-turret": "laserSpeed" };

/** Factorio caps speed and consumption penalties at -80%. */
const MIN_MULTIPLIER = 0.2;

/**
 * Module bonuses averaged over the machines of a type. Modules are installed per type, so
 * 3 speed modules on 3 drills act like one per drill.
 */
const moduleBonus = (state: GameState, machineId: MachineId) => {
  const machine = state.machines[machineId];
  const total = { speed: 0, productivity: 0, consumption: 0, pollution: 0 };
  if (machine.count <= 0) return total;
  for (const [id, n] of Object.entries(machine.modules) as Array<[ModuleId, number]>) {
    total.speed += (MODULES[id].speed * n) / machine.count;
    total.productivity += (MODULES[id].productivity * n) / machine.count;
    total.consumption += (MODULES[id].consumption * n) / machine.count;
    total.pollution += (MODULES[id].pollution * n) / machine.count;
  }
  return total;
};

/** Speed and energy multipliers of a machine type; they don't depend on the recipe. */
const machineEffects = (state: GameState, machineId: MachineId) => {
  const modules = moduleBonus(state, machineId);
  const research = 1 + techBonus(state, RESEARCH_SPEED_BONUS[machineId] ?? "none");
  return {
    speed: Math.max(MIN_MULTIPLIER, 1 + modules.speed) * research,
    consumption: Math.max(MIN_MULTIPLIER, 1 + modules.consumption),
    productivity: modules.productivity,
    pollution: Math.max(0, 1 + modules.pollution),
  };
};

const unitEffects = (state: GameState, machineId: MachineId, recipeId: RecipeId): Effects => {
  const { speed, consumption, productivity, pollution } = machineEffects(state, machineId);
  const category = RECIPES[recipeId].category;
  if (category === "solar") return { speed, consumption, pollution, output: daylight(dayTime(state.tick)) };
  // Laser turrets use 800 kJ per shot, so faster shooting draws more power.
  if (category === "turret-laser") return { speed, consumption: consumption * speed, pollution, output: healthPerShot(state, recipeId) };
  if (category === "turret-bullet") return { speed, consumption, pollution, output: healthPerShot(state, recipeId) };
  // As in Factorio, productivity never applies to buildings.
  if (category === "building") return { speed, consumption, pollution, output: 1 };
  const mining = category === "mining" || category === "oil-extraction" ? techBonus(state, "miningProductivity") : 0;
  return { speed, consumption, pollution, output: 1 + productivity + mining };
};

/** Total module slots of a machine type. */
const moduleSlots = (state: GameState, machineId: MachineId) => (MACHINES[machineId].moduleSlots ?? 0) * state.machines[machineId].count;

export { machineEffects, moduleSlots, NO_EFFECTS, unitEffects };
export type { Effects };
