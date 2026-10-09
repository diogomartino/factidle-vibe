import { entries } from "./catalog";
import type { Amounts } from "./catalog";
import { addAmount } from "./inventory";
import type { GameState, StatSample, Stats, StatTier, StatTierId } from "./types";

interface StatTierDef {
  id: StatTierId;
  label: string;
  /** Ticks per stored sample. */
  sampleTicks: number;
  /** Samples kept; sampleTicks x length is the window. */
  length: number;
}

/** Production history at several resolutions, like Factorio's production screen. */
const STAT_TIERS: StatTierDef[] = [
  { id: "5s", label: "5s", sampleTicks: 1, length: 50 },
  { id: "1m", label: "1m", sampleTicks: 10, length: 60 },
  { id: "10m", label: "10m", sampleTicks: 50, length: 120 },
  { id: "1h", label: "1h", sampleTicks: 300, length: 120 },
  { id: "10h", label: "10h", sampleTicks: 3000, length: 120 },
];

const emptySample = (tick: number): StatSample => ({ tick, produced: {}, consumed: {} });

const emptyTier = (): StatTier => ({ pending: emptySample(0), history: [] });

const createStats = (): Stats => ({
  lifetime: {},
  lifetimeConsumed: {},
  pending: emptySample(0),
  tiers: { "5s": emptyTier(), "1m": emptyTier(), "10m": emptyTier(), "1h": emptyTier(), "10h": emptyTier() },
});

const mergeInto = (target: Amounts, source: Amounts) => {
  for (const [id, n] of entries(source)) addAmount(target, id, n);
};

const copySample = (sample: StatSample): StatSample => ({ tick: sample.tick, produced: { ...sample.produced }, consumed: { ...sample.consumed } });

/** Copies what `recordStats` and production change; history arrays are shared and replaced on write. */
const copyStats = (stats: Stats): Stats => ({
  lifetime: { ...stats.lifetime },
  lifetimeConsumed: { ...stats.lifetimeConsumed },
  pending: copySample(stats.pending),
  tiers: Object.fromEntries(
    Object.entries(stats.tiers).map(([id, tier]) => [id, { pending: copySample(tier.pending), history: tier.history }]),
  ) as Stats["tiers"],
});

/** Call once per tick after `state.tick` advanced. */
const recordStats = (state: GameState) => {
  const { stats, tick } = state;
  mergeInto(stats.lifetimeConsumed, stats.pending.consumed);
  for (const tier of STAT_TIERS) {
    const { pending, history } = stats.tiers[tier.id];
    mergeInto(pending.produced, stats.pending.produced);
    mergeInto(pending.consumed, stats.pending.consumed);
    if (tick % tier.sampleTicks !== 0) continue;
    // A new array rather than push: history is shared with the previous state (see copyForTick).
    stats.tiers[tier.id] = { pending: emptySample(tick), history: [...history, { ...pending, tick }].slice(-tier.length) };
  }
  stats.pending = emptySample(tick);
};

export { copyStats, createStats, emptySample, recordStats, STAT_TIERS };
export type { StatTierDef };
