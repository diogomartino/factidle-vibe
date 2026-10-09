import { BASE_FLUID_STORAGE, BASE_STORAGE_SLOTS, MACHINE_IDS, MACHINES, RESOURCES } from "./catalog";
import type { Amounts, ItemId, ResourceId } from "./catalog";
import type { GameState } from "./types";

const storageSlots = (state: GameState) =>
  MACHINE_IDS.reduce(
    (slots, id) => slots + (MACHINES[id].storageSlots ?? 0) * state.machines[id].count,
    BASE_STORAGE_SLOTS,
  );

const fluidStorage = (state: GameState) =>
  MACHINE_IDS.reduce((total, id) => total + (MACHINES[id].fluidStorage ?? 0) * state.machines[id].count, BASE_FLUID_STORAGE);

/** Items hold stack size × slots; fluids share tank capacity rules instead. */
const capacityOf = (state: GameState, item: ItemId) => {
  const def = RESOURCES[item];
  if (def.capacity !== undefined) return def.capacity;
  return def.kind === "fluid" ? fluidStorage(state) : def.stackSize * storageSlots(state);
};

/** Where machines stop producing an item: its stock target, or the storage cap if lower. */
const machineCapOf = (state: GameState, item: ItemId) => Math.min(capacityOf(state, item), state.stockTargets[item] ?? Infinity);

/**
 * Rounds away floating-point drift. Machines add output in small per-tick steps, so stock
 * would otherwise read 4.999999999999998 instead of 5 and count as one item short.
 */
const snap = (value: number) => Math.round(value * 1e9) / 1e9;

const addAmount = (amounts: Amounts, id: ResourceId, value: number) => {
  amounts[id] = snap((amounts[id] ?? 0) + value);
};

/** Adds to the inventory without a cap; used for refunds and crafted items so nothing is lost. */
const giveItems = (state: GameState, items: Partial<Record<ItemId, number>>) => {
  for (const [id, n] of Object.entries(items) as Array<[ItemId, number]>) state.inventory[id] += n;
};

/** Adds up to the storage cap and records it as production. Returns the amount added. */
const produceCapped = (state: GameState, item: ItemId, amount: number) => {
  const added = Math.max(0, Math.min(amount, capacityOf(state, item) - state.inventory[item]));
  state.inventory[item] += added;
  addAmount(state.stats.lifetime, item, added);
  addAmount(state.stats.pending.produced, item, added);
  return added;
};

export { addAmount, capacityOf, fluidStorage, giveItems, machineCapOf, produceCapped, snap, storageSlots };
