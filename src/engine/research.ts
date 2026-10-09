import { addAmount } from "./inventory";
import type { Amounts } from "./catalog";
import { TECH_IDS, TECHNOLOGIES } from "./technologies";
import type { ResearchCost, TechBonus, TechDef, TechId } from "./technologies";
import type { GameState } from "./types";

type TechStatus = "researched" | "queued" | "available" | "locked";

/** Sum of a bonus over all researched technologies ("none" for machines without one). */
const techBonus = (state: GameState, bonus: TechBonus | "none") =>
  bonus === "none" ? 0 : state.research.researched.reduce((sum, id) => sum + (TECHNOLOGIES[id].bonus?.[bonus] ?? 0), 0);

const isResearched = (state: GameState, id: TechId) => state.research.researched.includes(id);

const researchCost = (id: TechId): ResearchCost | null => {
  const cost = TECHNOLOGIES[id].cost;
  return cost.kind === "research" ? cost : null;
};

/** The tech and all its unresearched prerequisites, prerequisites first. */
const withPrerequisites = (state: GameState, id: TechId): TechId[] => {
  const ordered: TechId[] = [];
  const visit = (tech: TechId) => {
    if (isResearched(state, tech) || ordered.includes(tech)) return;
    TECHNOLOGIES[tech].prerequisites.forEach(visit);
    ordered.push(tech);
  };
  visit(id);
  return ordered;
};

/** Lab research can be queued once every trigger tech it depends on is done. */
const canQueue = (state: GameState, id: TechId) =>
  !isResearched(state, id) && withPrerequisites(state, id).every((tech) => researchCost(tech) !== null);

const techStatus = (state: GameState, id: TechId): TechStatus => {
  if (isResearched(state, id)) return "researched";
  if (state.research.queue.includes(id)) return "queued";
  return canQueue(state, id) ? "available" : "locked";
};

/** Queues a tech after any of its missing prerequisites, like Factorio's research queue. */
const queueResearch = (state: GameState, id: TechId) => {
  if (!canQueue(state, id)) return;
  for (const tech of withPrerequisites(state, id)) if (!state.research.queue.includes(tech)) state.research.queue.push(tech);
};

/** Removes a tech and every queued tech that depends on it. */
const dequeueResearch = (state: GameState, id: TechId) => {
  state.research.queue = state.research.queue.filter((tech) => !withPrerequisites(state, tech).includes(id));
};

/** The tech labs are working on: the head of the queue. */
const currentResearch = (state: GameState): TechDef | null => {
  const head = state.research.queue[0];
  return head && researchCost(head) ? TECHNOLOGIES[head] : null;
};

/** Science packs one lab consumes per second at speed 1 for the current research. */
const labInputs = (state: GameState): Amounts | null => {
  const tech = currentResearch(state);
  const cost = tech && researchCost(tech.id);
  if (!cost) return null;
  const inputs: Amounts = {};
  for (const pack of cost.packs) addAmount(inputs, pack, 1 / cost.time);
  return inputs;
};

// Research and unlocks are replaced rather than mutated: ticks share them with the previous state.
const completeTech = (state: GameState, id: TechId) => {
  const { researched, queue, progress } = state.research;
  const { [id]: _done, ...rest } = progress;
  state.research = { researched: [...researched, id], queue: queue.filter((tech) => tech !== id), progress: rest };
  state.unlocked = [...new Set([...state.unlocked, ...TECHNOLOGIES[id].unlocks])];
};

/** Adds lab work (in research units) to the current research, finishing it when complete. */
const addResearchProgress = (state: GameState, units: number) => {
  const tech = currentResearch(state);
  const cost = tech && researchCost(tech.id);
  if (!tech || !cost) return;
  // ponytail: work beyond the last unit is dropped (at most one tick of lab time), not carried to the next tech.
  const progress = (state.research.progress[tech.id] ?? 0) + units;
  state.research = { ...state.research, progress: { ...state.research.progress, [tech.id]: progress } };
  if (progress >= cost.count - 1e-9) completeTech(state, tech.id);
};

/** Debug helper: researches every technology. */
const completeAllResearch = (state: GameState) => {
  for (const id of TECH_IDS) if (!isResearched(state, id)) completeTech(state, id);
};

/** Finishes trigger technologies whose prerequisites are done and whose item has been produced. */
const checkTriggers = (state: GameState) => {
  for (const id of TECH_IDS) {
    const cost = TECHNOLOGIES[id].cost;
    if (cost.kind !== "trigger" || isResearched(state, id)) continue;
    if (!TECHNOLOGIES[id].prerequisites.every((p) => isResearched(state, p))) continue;
    if ((state.stats.lifetime[cost.item] ?? 0) >= cost.amount) completeTech(state, id);
  }
};

/** The next trigger tech that can be worked towards, for the "next goal" hint. */
const nextTrigger = (state: GameState): TechDef | null =>
  TECH_IDS.map((id) => TECHNOLOGIES[id]).find(
    (t) => t.cost.kind === "trigger" && !isResearched(state, t.id) && t.prerequisites.every((p) => isResearched(state, p)),
  ) ?? null;

export {
  addResearchProgress,
  canQueue,
  checkTriggers,
  completeAllResearch,
  currentResearch,
  dequeueResearch,
  isResearched,
  labInputs,
  nextTrigger,
  queueResearch,
  researchCost,
  techBonus,
  techStatus,
};
export type { TechStatus };
