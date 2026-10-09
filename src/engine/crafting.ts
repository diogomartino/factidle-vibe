import { entries, HAND_CRAFTING_SPEED, handRecipeFor, isHandCraftable, MACHINES, mainResult, RECIPES } from "./catalog";
import type { ItemId, MachineId, RecipeDef, RecipeId } from "./catalog";
import { addAmount, giveItems } from "./inventory";
import type { CraftJob, GameState } from "./types";

type Missing = Partial<Record<ItemId, number>>;

/**
 * Orders a batch of planned jobs so identical crafts are adjacent: deepest
 * ingredients first, and within a depth grouped by recipe in first-seen order.
 * Building 5 drills thus runs gears x15, furnaces x5, then drills x5. Children
 * are always deeper than their parent, so they still finish first. Each craft
 * keeps its own group, so cancelling still removes one craft at a time.
 */
const batchOrder = (jobs: CraftJob[]) => {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const depth = (job: CraftJob): number => {
    const parent = job.parent === null ? undefined : byId.get(job.parent);
    return parent ? 1 + depth(parent) : 0;
  };
  const firstSeen = new Map<string, number>();
  const keyed = jobs.map((job, index) => {
    const level = depth(job);
    const key = `${level}:${job.recipe}`;
    if (!firstSeen.has(key)) firstSeen.set(key, index);
    return { job, level, recipeOrder: firstSeen.get(key)!, index };
  });
  keyed.sort((a, b) => b.level - a.level || a.recipeOrder - b.recipeOrder || a.index - b.index);
  return keyed.map((k) => k.job);
};

/**
 * Plans crafts against a scratch copy of the inventory. Ingredients the player
 * lacks are auto-queued as sub-jobs when they can be hand-crafted.
 */
const createPlanner = (state: GameState) => {
  const inventory = { ...state.inventory };
  const jobs: CraftJob[] = [];
  let nextId = state.nextJobId;

  const plan = (recipe: RecipeDef, missing: Missing, root: boolean, group?: number, parent: number | null = null, toParent: CraftJob["toParent"] = {}) => {
    const id = nextId++;
    const job: CraftJob = {
      id,
      group: group ?? id,
      parent,
      recipe: recipe.id,
      progress: 0,
      held: {},
      toParent,
      place: root && recipe.category === "building",
    };
    for (const [item, needed] of entries(recipe.ingredients) as Array<[ItemId, number]>) {
      const take = Math.min(Math.floor(inventory[item]), needed);
      inventory[item] -= take;
      if (take > 0) job.held[item] = take;
      let short = needed - take;
      const sub = short > 0 ? handRecipeFor(item) : undefined;
      if (!sub) {
        if (short > 0) addAmount(missing, item, short);
        continue;
      }
      const yields = sub.results[item]!;
      for (; short > 0; short -= yields) plan(sub, missing, false, job.group, id, { [item]: Math.min(yields, short) });
    }
    jobs.push(job); // after its sub-jobs, so they run first
  };

  const placed: MachineId[] = [];

  /** Plans one more craft; returns what is missing (empty when affordable). Buildings in storage are placed first. */
  const add = (recipeId: RecipeId): Missing => {
    const missing: Missing = {};
    const recipe = RECIPES[recipeId];
    if (!isHandCraftable(recipeId)) return { [mainResult(recipeId) as ItemId]: 1 };
    const stored = recipeId as MachineId & ItemId;
    if (recipe.category === "building" && inventory[stored] >= 1) {
      inventory[stored] -= 1;
      placed.push(stored);
      return missing;
    }
    plan(recipe, missing, true);
    return missing;
  };

  const commit = () => {
    state.inventory = inventory;
    for (const id of placed) state.machines[id].count++;
    state.queue.push(...batchOrder(jobs));
    state.nextJobId = nextId;
  };

  return { add, commit };
};

const hasMissing = (missing: Missing) => Object.keys(missing).length > 0;

const planCrafts = (state: GameState, recipeId: RecipeId, count: number) => {
  const planner = createPlanner(state);
  const missing: Missing = {};
  for (let i = 0; i < count; i++)
    for (const [item, n] of Object.entries(planner.add(recipeId)) as Array<[ItemId, number]>) addAmount(missing, item, n);
  return { missing, commit: planner.commit };
};

/** Raw ingredients missing to queue `count` crafts; empty when affordable. Does not change state. */
const previewCraft = (state: GameState, recipeId: RecipeId, count = 1) => planCrafts(state, recipeId, count).missing;

/** Queues `count` crafts. Returns the missing raw ingredients, or null when queued. */
const enqueueCraft = (state: GameState, recipeId: RecipeId, count = 1): Missing | null => {
  const { missing, commit } = planCrafts(state, recipeId, count);
  if (hasMissing(missing)) return missing;
  commit();
  return null;
};

/** How many crafts the current inventory can pay for, up to `limit`. */
const maxCraftable = (state: GameState, recipeId: RecipeId, limit = 100) => {
  const planner = createPlanner(state);
  let count = 0;
  while (count < limit && !hasMissing(planner.add(recipeId))) count++;
  return count;
};

/** Cancels a root job with its sub-jobs and refunds everything they reserved. */
const cancelCraft = (state: GameState, group: number) => {
  for (const job of state.queue) if (job.group === group) giveItems(state, job.held);
  state.queue = state.queue.filter((job) => job.group !== group);
};

const completeJob = (state: GameState, job: CraftJob) => {
  const recipe = RECIPES[job.recipe];
  const parent = state.queue.find((j) => j.id === job.parent);
  const { produced, consumed } = state.stats.pending;
  for (const [id, n] of entries(recipe.ingredients)) addAmount(consumed, id, n);
  for (const [item, n] of entries(recipe.results) as Array<[ItemId, number]>) {
    addAmount(produced, item, n);
    addAmount(state.stats.lifetime, item, n);
    const handed = parent ? (job.toParent[item] ?? 0) : 0;
    if (parent && handed > 0) parent.held[item] = (parent.held[item] ?? 0) + handed;
    if (job.place && item in MACHINES) {
      // Replaced, not mutated: ticks share machines with the previous state.
      const machine = state.machines[item as MachineId];
      state.machines = { ...state.machines, [item]: { ...machine, count: machine.count + n - handed } };
    }
    else giveItems(state, { [item]: n - handed });
  }
};

/** Advances the serial hand-crafting queue by `dt` seconds. */
const progressQueue = (state: GameState, dt: number) => {
  let time = dt * HAND_CRAFTING_SPEED;
  while (time > 0 && state.queue.length > 0) {
    const job = state.queue[0]!;
    const remaining = RECIPES[job.recipe].time - job.progress;
    if (time < remaining) {
      job.progress += time;
      return;
    }
    time -= remaining;
    state.queue.shift();
    completeJob(state, job);
  }
};

export { cancelCraft, enqueueCraft, hasMissing, maxCraftable, previewCraft, progressQueue };
export type { Missing };
