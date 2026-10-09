import { RESOURCE_IDS, RESOURCES, TICK_SECONDS } from "../engine/catalog";
import { STAT_TIERS } from "../engine/stats";
import type { ResourceId } from "../engine/catalog";
import type { StatTierDef } from "../engine/stats";
import type { StatSample, StatTierId } from "../engine/types";

/** Everything except buildings has production worth charting. */
const CHARTABLE = RESOURCE_IDS.filter((id) => RESOURCES[id].kind !== "building");

const tierById = (id: StatTierId): StatTierDef => STAT_TIERS.find((t) => t.id === id)!;

const sampleSeconds = (tier: StatTierDef) => tier.sampleTicks * TICK_SECONDS;

/**
 * Chart columns for a resource: seconds relative to the newest sample (<= 0),
 * then per-second produced and consumed.
 */
const rateSeries = (tier: StatTierDef, history: StatSample[], id: ResourceId): [number[], number[], number[]] => {
  const seconds = sampleSeconds(tier);
  const last = history.at(-1)?.tick ?? 0;
  return [
    history.map((s) => (s.tick - last) * TICK_SECONDS),
    history.map((s) => (s.produced[id] ?? 0) / seconds),
    history.map((s) => (s.consumed[id] ?? 0) / seconds),
  ];
};

type Metric = "produced" | "consumed";

/** `rate`: per second in each sample. `total`: running amount since the start of the window. */
type ChartMode = "rate" | "total";

/** Seconds relative to the newest sample (<= 0), then `metric` for each resource in the chosen mode. */
const metricColumns = (tier: StatTierDef, history: StatSample[], ids: ResourceId[], metric: Metric, mode: ChartMode = "rate"): number[][] => {
  const seconds = sampleSeconds(tier);
  const last = history.at(-1)?.tick ?? 0;
  const column = (id: ResourceId) => {
    if (mode === "rate") return history.map((s) => (s[metric][id] ?? 0) / seconds);
    let sum = 0;
    return history.map((s) => (sum += s[metric][id] ?? 0));
  };
  return [history.map((s) => (s.tick - last) * TICK_SECONDS), ...ids.map(column)];
};

/** Resources can share a chart only if they share a unit: items, fluids (units/s) or power (W). */
const unitGroup = (id: ResourceId) => RESOURCES[id].unit ?? "items";

/** A charted resource and its palette slot; the slot sticks so colors don't shift when others are removed. */
interface ChartSelection {
  id: ResourceId;
  slot: number;
}

const MAX_SERIES = 8;

/** Adds a resource; one with a different unit replaces the selection instead. */
const addToSelection = (selection: ChartSelection[], id: ResourceId): ChartSelection[] => {
  if (selection.some((s) => s.id === id)) return selection;
  if (selection.length > 0 && unitGroup(selection[0]!.id) !== unitGroup(id)) return [{ id, slot: 0 }];
  if (selection.length >= MAX_SERIES) return selection;
  const used = new Set(selection.map((s) => s.slot));
  const slot = Array.from({ length: MAX_SERIES }, (_, i) => i).find((i) => !used.has(i))!;
  return [...selection, { id, slot }];
};

/** Removes a resource, always keeping at least one. */
const removeFromSelection = (selection: ChartSelection[], id: ResourceId) =>
  selection.length > 1 ? selection.filter((s) => s.id !== id) : selection;

const toggleInSelection = (selection: ChartSelection[], id: ResourceId) =>
  selection.some((s) => s.id === id) ? removeFromSelection(selection, id) : addToSelection(selection, id);

/** Average per-second production and consumption over the tier's stored window. */
const windowTotals = (tier: StatTierDef, history: StatSample[], id: ResourceId) => {
  const seconds = Math.max(1, history.length) * sampleSeconds(tier);
  const sum = (key: "produced" | "consumed") => history.reduce((acc, s) => acc + (s[key][id] ?? 0), 0);
  const producedTotal = sum("produced");
  const consumedTotal = sum("consumed");
  const produced = producedTotal / seconds;
  const consumed = consumedTotal / seconds;
  return { produced, consumed, net: produced - consumed, producedTotal, consumedTotal };
};

/** "now", "45s", "12m", "3.5h" for a relative time in seconds. */
const formatAgo = (secondsAgo: number) => {
  const s = Math.abs(secondsAgo);
  if (s < 0.05) return "now";
  if (s < 10) return `-${Number(s.toFixed(1))}s`;
  if (s < 60) return `-${Math.round(s)}s`;
  if (s < 3600) return `-${Number((s / 60).toFixed(1))}m`;
  return `-${Number((s / 3600).toFixed(1))}h`;
};

export {
  addToSelection,
  CHARTABLE,
  formatAgo,
  MAX_SERIES,
  metricColumns,
  rateSeries,
  removeFromSelection,
  sampleSeconds,
  tierById,
  toggleInSelection,
  unitGroup,
  windowTotals,
};
export type { ChartMode, ChartSelection, Metric };
