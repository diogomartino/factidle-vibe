import type { MachineId, RecipeId } from "./catalog";
import type { GameState } from "./types";

type UnlockId = MachineId | RecipeId;

/** Available from the start, as in Factorio 2.0; everything else comes from technologies. */
const INITIAL_UNLOCKS: UnlockId[] = [
  "burner-mining-drill",
  "stone-furnace",
  "iron-chest",
  "mine-iron-ore",
  "mine-copper-ore",
  "mine-coal",
  "mine-stone",
  "iron-plate",
  "copper-plate",
  "stone-brick",
  "iron-gear-wheel",
  "transport-belt",
  "firearm-magazine",
];

const isUnlocked = (state: GameState, id: UnlockId) => state.unlocked.includes(id);

export { INITIAL_UNLOCKS, isUnlocked };
export type { UnlockId };
