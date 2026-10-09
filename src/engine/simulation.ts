import { ITEM_IDS, MACHINE_IDS, TICK_SECONDS } from "./catalog";
import type { ItemId, MachineId } from "./catalog";
import { progressQueue } from "./crafting";
import { emptyReport, runProduction } from "./production";
import { copyStats, createStats, recordStats } from "./stats";
import type { GameState, MachineState } from "./types";
import { checkTriggers } from "./research";
import { INITIAL_UNLOCKS } from "./unlocks";

/** Factorio's starting kit. */
const STARTING_ITEMS: Partial<Record<ItemId, number>> = { "iron-plate": 8 };
const STARTING_MACHINES: Partial<Record<MachineId, number>> = { "burner-mining-drill": 1, "stone-furnace": 1 };

const createNewGame = (): GameState => ({
  tick: 0,
  inventory: Object.fromEntries(ITEM_IDS.map((id) => [id, STARTING_ITEMS[id] ?? 0])) as Record<ItemId, number>,
  machines: Object.fromEntries(
    MACHINE_IDS.map((id): [MachineId, MachineState] => [
      id,
      { count: STARTING_MACHINES[id] ?? 0, enabled: true, running: 1, priority: 0, allocations: {}, modules: {} },
    ]),
  ) as Record<MachineId, MachineState>,
  queue: [],
  nextJobId: 1,
  unlocked: [...INITIAL_UNLOCKS],
  stockTargets: {},
  research: { researched: [], queue: [], progress: {} },
  storedEnergy: 0,
  rocket: { launches: 0, firstLaunchTick: null, acknowledged: false },
  combat: { peaceful: false, pollution: 0, evolution: 0, wallDamage: 0, buildingDamage: 0, kills: 0, handFire: 0, losses: {}, lastLoss: null },
  stats: createStats(),
  report: emptyReport(),
});

/** Advances the game by one fixed timestep. Deterministic for a given state. */
const stepTick = (state: GameState) => {
  runProduction(state, TICK_SECONDS);
  progressQueue(state, TICK_SECONDS);
  state.tick++;
  recordStats(state);
  checkTriggers(state);
};

/** Advances several ticks in place; the building block for future offline progress. */
const advance = (state: GameState, ticks: number) => {
  for (let i = 0; i < ticks; i++) stepTick(state);
};

/**
 * Copies the parts of the state a tick changes in place: inventory, the craft queue and stats.
 * The rarer changes (research, unlocks, machines, rocket) replace their object when they happen,
 * so untouched data keeps its identity and React only re-renders what changed.
 */
const copyForTick = (state: GameState): GameState => ({
  ...state,
  inventory: { ...state.inventory },
  queue: state.queue.length > 0 ? state.queue.map((job) => ({ ...job, held: { ...job.held } })) : state.queue,
  stats: copyStats(state.stats),
});

/**
 * Advances `ticks` ticks and returns the new state without changing `state`. Redux uses this
 * instead of an Immer draft: proxied writes made a tick about 20x slower.
 */
const advanced = (state: GameState, ticks: number) => {
  const next = copyForTick(state);
  advance(next, ticks);
  return next;
};

export { advance, advanced, createNewGame, stepTick };
