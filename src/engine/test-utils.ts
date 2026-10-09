import { ITEM_IDS, MACHINE_IDS } from "./catalog";
import type { ItemId, MachineId, RecipeId } from "./catalog";
import { createNewGame } from "./simulation";
import type { GameState } from "./types";

type Setup = {
  items?: Partial<Record<ItemId, number>>;
  machines?: Partial<Record<MachineId, { count: number; priority?: number; allocations?: Partial<Record<RecipeId, number>> }>>;
};

/** A game with exactly these items and machines, plus 100 iron chests so caps stay out of the way. */
const setup = ({ items = {}, machines = {} }: Setup): GameState => {
  const state = createNewGame();
  for (const id of ITEM_IDS) state.inventory[id] = items[id] ?? 0;
  for (const id of MACHINE_IDS) {
    const m = machines[id];
    state.machines[id] = { count: m?.count ?? 0, enabled: true, running: 1, priority: m?.priority ?? 0, allocations: m?.allocations ?? {}, modules: {} };
  }
  state.machines["iron-chest"].count = machines["iron-chest"]?.count ?? 100;
  return state;
};

export { setup };
