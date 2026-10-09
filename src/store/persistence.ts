import { ITEM_IDS, MACHINE_IDS, MACHINES, MODULE_IDS, RECIPES, recipesFor, RESOURCE_IDS } from "../engine/catalog";
import type { Amounts, ItemId, MachineId, RecipeId } from "../engine/catalog";
import { emptyReport } from "../engine/production";
import { createNewGame } from "../engine/simulation";
import { STAT_TIERS } from "../engine/stats";
import { TECH_IDS, TECHNOLOGIES } from "../engine/technologies";
import type { TechId } from "../engine/technologies";
import type { CraftJob, GameState, MachineState, ResearchState, StatSample, Stats } from "../engine/types";
import { INITIAL_UNLOCKS } from "../engine/unlocks";

/**
 * Save file: `{ version, savedAt, state }` as JSON.
 * Bump SAVE_VERSION when the state shape changes and add a migration from the
 * previous version. New catalog entries need no migration: `normalize` fills
 * anything missing with new-game defaults.
 */
const SAVE_VERSION = 5;
const STORAGE_KEY = "factidle-save";

type Json = Record<string, unknown>;

interface SaveFile {
  version: number;
  /** ISO time of the save; lets future offline progress know how long the game was closed. */
  savedAt: string;
  state: GameState;
}

const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const record = (value: unknown): Json => (isRecord(value) ? value : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** MIGRATIONS[n] upgrades a version n state to version n + 1. */
// v3 (research) intentionally has no migration from older saves: they are discarded.
// v4 (oil, modules, solar, rocket) and v5 (combat) only added fields, which `normalize` defaults.
const MIGRATIONS: Record<number, (state: Json) => Json> = { 3: (state) => state, 4: (state) => state };

/** Keeps only known ids with finite, non-negative amounts. */
const amounts = <K extends string>(value: unknown, ids: readonly K[]): Partial<Record<K, number>> => {
  const raw = record(value);
  const result: Partial<Record<K, number>> = {};
  for (const id of ids) if (num(raw[id]) > 0) result[id] = num(raw[id]);
  return result;
};

const normalizeMachine = (value: unknown, fallback: MachineState, recipes: RecipeId[], wholeMachines: boolean): MachineState => {
  const raw = record(value);
  const count = Math.max(0, Math.floor(num(raw.count, fallback.count)));
  const allocations = amounts(raw.allocations, recipes);
  if (wholeMachines) {
    // Whole machines: integer counts that fit in the owned total, first come first served.
    let free = count;
    for (const id of recipes) {
      const assigned = Math.min(Math.floor(allocations[id] ?? 0), free);
      free -= assigned;
      if (assigned > 0) allocations[id] = assigned;
      else delete allocations[id];
    }
  } else {
    const total = Object.values(allocations).reduce((sum, share) => sum + share, 0);
    if (total > 1) for (const id of recipes) if (allocations[id]) allocations[id] /= total;
  }
  return {
    count,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    running: Math.max(0, Math.min(1, num(raw.running, fallback.running))),
    priority: Math.round(num(raw.priority, fallback.priority)),
    allocations,
    modules: Object.fromEntries(Object.entries(amounts(raw.modules, MODULE_IDS)).map(([id, n]) => [id, Math.floor(n)])),
  };
};

const normalizeJob = (value: unknown): CraftJob | null => {
  const raw = record(value);
  if (typeof raw.recipe !== "string" || !(raw.recipe in RECIPES) || typeof raw.id !== "number") return null;
  return {
    id: raw.id,
    group: num(raw.group, raw.id),
    parent: typeof raw.parent === "number" ? raw.parent : null,
    recipe: raw.recipe as RecipeId,
    progress: num(raw.progress),
    held: amounts(raw.held, ITEM_IDS),
    toParent: amounts(raw.toParent, ITEM_IDS),
    place: raw.place === true,
  };
};

const normalizeSample = (value: unknown): StatSample => {
  const raw = record(value);
  return { tick: num(raw.tick), produced: amounts(raw.produced, RESOURCE_IDS), consumed: amounts(raw.consumed, RESOURCE_IDS) };
};

const isTech = (id: unknown): id is TechId => typeof id === "string" && TECH_IDS.includes(id as TechId);

const normalizeResearch = (value: unknown): ResearchState => {
  const raw = record(value);
  const researched = [...new Set(list(raw.researched).filter(isTech))];
  return {
    researched,
    queue: [...new Set(list(raw.queue).filter(isTech))].filter((id) => !researched.includes(id)),
    progress: amounts(raw.progress, TECH_IDS),
  };
};

/** Rebuilds a valid GameState from untrusted data, defaulting anything missing or invalid. */
const normalize = (value: unknown): GameState => {
  const raw = record(value);
  const fresh = createNewGame();
  const inventory = amounts(raw.inventory, ITEM_IDS);
  const machines = record(raw.machines);
  const stats = record(raw.stats);
  const queue = list(raw.queue).map(normalizeJob).filter((job): job is CraftJob => job !== null);
  const research = normalizeResearch(raw.research);
  const rocket = record(raw.rocket);
  const combat = record(raw.combat);
  const lastLoss = record(combat.lastLoss);
  return {
    tick: Math.max(0, Math.floor(num(raw.tick))),
    inventory: Object.fromEntries(ITEM_IDS.map((id) => [id, inventory[id] ?? 0])) as Record<ItemId, number>,
    machines: Object.fromEntries(
      MACHINE_IDS.map((id) => [id, normalizeMachine(machines[id], fresh.machines[id], recipesFor(id), MACHINES[id].wholeMachines === true)]),
    ) as GameState["machines"],
    queue,
    nextJobId: Math.max(num(raw.nextJobId, 1), ...queue.map((job) => job.id + 1)),
    // Derived from research rather than trusted from the file.
    unlocked: [...new Set([...INITIAL_UNLOCKS, ...research.researched.flatMap((id) => TECHNOLOGIES[id].unlocks)])],
    stats: {
      lifetime: amounts(stats.lifetime, RESOURCE_IDS) as Amounts,
      lifetimeConsumed: amounts(stats.lifetimeConsumed, RESOURCE_IDS) as Amounts,
      pending: normalizeSample(stats.pending),
      tiers: Object.fromEntries(
        STAT_TIERS.map((tier) => {
          const saved = record(record(stats.tiers)[tier.id]);
          const history = list(saved.history).map(normalizeSample).slice(-tier.length);
          return [tier.id, { pending: normalizeSample(saved.pending), history }];
        }),
      ) as Stats["tiers"],
    },
    research,
    storedEnergy: Math.max(0, num(raw.storedEnergy)),
    rocket: {
      launches: Math.max(0, Math.floor(num(rocket.launches))),
      firstLaunchTick: typeof rocket.firstLaunchTick === "number" ? rocket.firstLaunchTick : null,
      acknowledged: rocket.acknowledged === true,
    },
    combat: {
      peaceful: combat.peaceful === true,
      pollution: Math.max(0, num(combat.pollution)),
      evolution: Math.max(0, Math.min(1, num(combat.evolution))),
      wallDamage: Math.max(0, num(combat.wallDamage)),
      buildingDamage: Math.max(0, num(combat.buildingDamage)),
      kills: Math.max(0, num(combat.kills)),
      handFire: Math.max(0, num(combat.handFire)),
      losses: amounts(combat.losses, MACHINE_IDS),
      lastLoss:
        typeof lastLoss.machine === "string" && MACHINE_IDS.includes(lastLoss.machine as MachineId)
          ? { machine: lastLoss.machine as MachineId, tick: num(lastLoss.tick) }
          : null,
    },
    stockTargets: amounts(raw.stockTargets, ITEM_IDS),
    report: emptyReport(),
  };
};

const serialize = (state: GameState) =>
  JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), state } satisfies SaveFile);

/** Parses and migrates a save. Throws an Error with a readable message when it is unusable. */
const deserialize = (text: string): GameState => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Save is not valid JSON.");
  }
  if (!isRecord(parsed) || typeof parsed.version !== "number" || !isRecord(parsed.state))
    throw new Error("Save is missing its version or state.");
  if (parsed.version > SAVE_VERSION) throw new Error(`Save is from a newer version (${parsed.version}).`);
  let state = parsed.state;
  for (let v = parsed.version; v < SAVE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new Error(`No migration from save version ${v}.`);
    state = migrate(state);
  }
  return normalize(state);
};

const saveToStorage = (state: GameState) => {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
};

/** Returns the stored game, or null when there is none or it cannot be read. */
const BACKUP_KEY = `${STORAGE_KEY}-unreadable`;

/**
 * Loads the stored game (null when there is none). A save that exists but can't be read is
 * copied to BACKUP_KEY first, so the next autosave can't destroy it, and the reason is returned.
 */
const loadFromStorage = (): { state: GameState | null; error: string | null } => {
  let text: string | null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: null, error: null }; // storage unavailable: nothing to lose
  }
  if (!text) return { state: null, error: null };
  try {
    return { state: deserialize(text), error: null };
  } catch (error) {
    let kept = false;
    try {
      localStorage.setItem(BACKUP_KEY, text);
      kept = true;
    } catch {
      // Storage full or blocked: report without the backup note.
    }
    const reason = error instanceof Error ? error.message : "unreadable data.";
    return { state: null, error: `${reason}${kept ? ` A copy was kept in browser storage under "${BACKUP_KEY}".` : ""}` };
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
};

export { BACKUP_KEY, clearStorage, deserialize, loadFromStorage, MIGRATIONS, SAVE_VERSION, saveToStorage, serialize };
export type { SaveFile };
