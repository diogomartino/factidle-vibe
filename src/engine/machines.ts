import { recipesFor } from "./catalog";
import type { ItemId, MachineId, ModuleId, RecipeId } from "./catalog";
import { moduleSlots } from "./effects";
import type { GameState, MachineState } from "./types";
import { isUnlocked } from "./unlocks";

const MAX_PRIORITY = 5;

const toPercentStep = (fraction: number) => Math.round(fraction * 100) / 100;

const allocationTotal = (machine: MachineState) =>
  toPercentStep(Object.values(machine.allocations).reduce((sum, share) => sum + share, 0));

const canAllocate = (state: GameState, machineId: MachineId, recipeId: RecipeId) =>
  recipesFor(machineId).includes(recipeId) && isUnlocked(state, recipeId);

/** Sets a recipe's share, clamped so all shares stay within 0..100%. */
const setAllocation = (state: GameState, machineId: MachineId, recipeId: RecipeId, fraction: number) => {
  if (!canAllocate(state, machineId, recipeId)) return;
  const machine = state.machines[machineId];
  const others = allocationTotal(machine) - (machine.allocations[recipeId] ?? 0);
  machine.allocations[recipeId] = Math.max(0, Math.min(toPercentStep(fraction), toPercentStep(1 - others)));
};

/** Adds a recipe using all capacity not yet allocated. */
const addAllocation = (state: GameState, machineId: MachineId, recipeId: RecipeId) => {
  if (state.machines[machineId].allocations[recipeId] !== undefined) return;
  setAllocation(state, machineId, recipeId, 1);
};

const removeAllocation = (state: GameState, machineId: MachineId, recipeId: RecipeId) => {
  delete state.machines[machineId].allocations[recipeId];
};

/** Machines assigned to recipes, for machine types that assign whole machines. */
const assignedMachines = (machine: MachineState) => Object.values(machine.allocations).reduce((sum, n) => sum + n, 0);

/** Adds a recipe to a whole-machine type with every unassigned machine. */
const addAssignment = (state: GameState, machineId: MachineId, recipeId: RecipeId) => {
  const machine = state.machines[machineId];
  if (machine.allocations[recipeId] === undefined) assignMachines(state, machineId, recipeId, machine.count - assignedMachines(machine));
};

/** Assigns whole machines to a recipe, never more than are owned and unassigned. 0 removes the recipe. */
const assignMachines = (state: GameState, machineId: MachineId, recipeId: RecipeId, count: number) => {
  if (!canAllocate(state, machineId, recipeId)) return;
  const machine = state.machines[machineId];
  const others = assignedMachines(machine) - (machine.allocations[recipeId] ?? 0);
  const assigned = Math.max(0, Math.min(Math.floor(count), machine.count - others));
  if (assigned > 0) machine.allocations[recipeId] = assigned;
  else delete machine.allocations[recipeId];
};

/** Sets or clears (null) the "keep N in stock" target for an item. */
const setStockTarget = (state: GameState, item: ItemId, target: number | null) => {
  if (target === null || !Number.isFinite(target)) delete state.stockTargets[item];
  else state.stockTargets[item] = Math.max(0, Math.floor(target));
};

/** Whole machines actually running after the "running %" setting (rounded to the nearest machine). */
const runningCount = (machine: Pick<MachineState, "count" | "running">) => Math.round(machine.count * machine.running);

/** Sets the fraction of machines that run, in whole percent. */
const setRunning = (state: GameState, machineId: MachineId, fraction: number) => {
  state.machines[machineId].running = Math.max(0, Math.min(1, Math.round(fraction * 100) / 100));
};

const installedModules = (state: GameState, machineId: MachineId) =>
  Object.values(state.machines[machineId].modules).reduce((sum, n) => sum + n, 0);

/**
 * Sets how many of a module are installed in a machine type, moving modules between storage and
 * the machines. Limited by free slots and modules in storage.
 */
const setModules = (state: GameState, machineId: MachineId, module: ModuleId, count: number) => {
  if (!isUnlocked(state, module)) return;
  const modules = state.machines[machineId].modules;
  const current = modules[module] ?? 0;
  const free = moduleSlots(state, machineId) - installedModules(state, machineId);
  const target = Math.max(0, Math.min(Math.floor(count), current + free, current + Math.floor(state.inventory[module])));
  state.inventory[module] -= target - current;
  if (target > 0) modules[module] = target;
  else delete modules[module];
};

const setPriority = (state: GameState, machineId: MachineId, priority: number) => {
  state.machines[machineId].priority = Math.max(-MAX_PRIORITY, Math.min(MAX_PRIORITY, Math.round(priority)));
};

export {
  addAllocation,
  addAssignment,
  installedModules,
  allocationTotal,
  assignedMachines,
  assignMachines,
  MAX_PRIORITY,
  removeAllocation,
  runningCount,
  setAllocation,
  setModules,
  setPriority,
  setRunning,
  setStockTarget,
};
