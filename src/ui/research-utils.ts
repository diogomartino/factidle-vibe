import { mainResult, RESOURCES } from "../engine/catalog";
import type { ResourceId } from "../engine/catalog";
import { currentResearch, nextTrigger, researchCost, techStatus } from "../engine/research";
import { TECH_IDS, TECHNOLOGIES } from "../engine/technologies";
import type { TechBonus, TechDef, TechId } from "../engine/technologies";
import { unitEffects } from "../engine/effects";
import { researchRate } from "../engine/production";
import type { GameState } from "../engine/types";
import { formatPercent } from "./format-utils";

/** Resources a tech unlocks, as icons (internal recipes like "research" have none). */
const unlockIcons = (tech: TechDef): ResourceId[] => [
  ...new Set(tech.unlocks.filter((id) => id !== "research").map((id) => (id in RESOURCES ? (id as ResourceId) : mainResult(id)))),
];

const BONUS_TEXT: Record<TechBonus, (value: number) => string> = {
  miningProductivity: (v) => `+${Math.round(v * 100)}% mining productivity`,
  labSpeed: (v) => `+${Math.round(v * 100)}% lab speed`,
  manualMining: (v) => `${v + 1}× ore per manual mining action`,
  bulletDamage: (v) => `+${Math.round(v * 100)}% bullet damage`,
  gunTurretDamage: (v) => `+${Math.round(v * 100)}% gun turret damage`,
  bulletSpeed: (v) => `+${Math.round(v * 100)}% gun turret shooting speed`,
  laserDamage: (v) => `+${Math.round(v * 100)}% laser damage`,
  laserSpeed: (v) => `+${Math.round(v * 100)}% laser shooting speed`,
};

/** What a research bonus does, e.g. "+10% mining productivity"; empty for techs without one. */
const bonusText = (tech: TechDef) =>
  (Object.entries(tech.bonus ?? {}) as Array<[TechBonus, number]>).map(([bonus, value]) => BONUS_TEXT[bonus](value)).join(", ");

/** Research units done and needed for a lab tech. */
const researchProgress = (state: GameState, id: TechId) => {
  const cost = researchCost(id);
  return { done: state.research.progress[id] ?? 0, total: cost?.count ?? 0 };
};

/** Trigger item produced so far and needed. */
const triggerProgress = (state: GameState, tech: TechDef) =>
  tech.cost.kind === "trigger" ? { done: Math.min(tech.cost.amount, Math.floor(state.stats.lifetime[tech.cost.item] ?? 0)), total: tech.cost.amount } : null;

/** Short description of what to do next, for the top bar. */
const researchGoal = (state: GameState): string | null => {
  const current = currentResearch(state);
  if (current) {
    const { done, total } = researchProgress(state, current.id);
    return `Researching ${current.name} · ${formatPercent(done / total)}`;
  }
  const trigger = nextTrigger(state);
  if (trigger?.cost.kind === "trigger") {
    const progress = triggerProgress(state, trigger)!;
    return `${trigger.name}: produce ${trigger.cost.amount} × ${RESOURCES[trigger.cost.item].name} (${progress.done}/${progress.total})`;
  }
  return TECH_IDS.some((id) => techStatus(state, id) === "available") ? "Pick a research in the Research tab" : null;
};

/** Labs' speed on the current research, in research units per second, and why they're slowed. */
const labThroughput = (state: GameState) => {
  const tech = currentResearch(state);
  if (!tech || tech.cost.kind !== "research") return null;
  const unit = state.report.units.find((u) => u.recipe === "research");
  const potential = unit ? researchRate({ machine: "lab", scale: unit.scale, effects: unitEffects(state, "lab", "research") }, tech.cost.time) : 0;
  return { tech, unit, potential, actual: potential * (unit?.ratio ?? 0) };
};

const STATUS_ORDER = { queued: 0, available: 1, locked: 2, researched: 3 } as const;

/** Techs worth acting on first, researched ones last; catalog order within a status. */
const sortedTechs = (state: GameState) =>
  TECH_IDS.map((id) => TECHNOLOGIES[id]).sort((a, b) => STATUS_ORDER[techStatus(state, a.id)] - STATUS_ORDER[techStatus(state, b.id)]);

export { bonusText, labThroughput, researchGoal, researchProgress, sortedTechs, triggerProgress, unlockIcons };
