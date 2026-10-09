import type { Amounts, FlowId, ItemId, MachineId, ModuleId, RecipeId, ResourceId } from "./catalog";
import type { TechId } from "./technologies";

interface MachineState {
  count: number;
  enabled: boolean;
  /** Fraction (0..1) of owned machines that run, rounded to whole machines; the rest stay idle and use no fuel or power. */
  running: number;
  /** Higher priority machines take shared inputs first. */
  priority: number;
  /** Fraction (0..1) of total capacity assigned to each recipe; sums to <= 1. */
  allocations: Partial<Record<RecipeId, number>>;
  /** Modules installed across all machines of the type (taken out of storage). */
  modules: Partial<Record<ModuleId, number>>;
}

interface CraftJob {
  id: number;
  /** Jobs auto-queued for missing ingredients share their root job's group. */
  group: number;
  parent: number | null;
  recipe: RecipeId;
  /** Seconds of progress made. */
  progress: number;
  /** Ingredients already reserved for this job; refunded on cancel. */
  held: Partial<Record<ItemId, number>>;
  /** Results handed to the parent job instead of the inventory. */
  toParent: Partial<Record<ItemId, number>>;
  /** Root building jobs place the building instead of storing it. */
  place: boolean;
}

/** Why a production unit is below full speed. */
interface Limit {
  resource: ResourceId;
  /**
   * `input`: not enough supply. `output`: no room for items, or no demand for a flow.
   * `target`: the item reached the stock target the player set.
   */
  side: "input" | "output" | "target";
}

interface UnitReport {
  machine: MachineId;
  recipe: RecipeId;
  /** Actual speed as a fraction of potential (0..1). */
  ratio: number;
  /** Machine-equivalents assigned to this recipe (count x allocation). */
  scale: number;
  /** Speed (0..1) it would run at if water, steam and power were unlimited; drives flow demand. */
  demand: number;
  limit: Limit | null;
}

interface FlowReport {
  /** Per second actually produced (= consumed). */
  produced: number;
  /** Per second the producers could make. */
  capacity: number;
  /** Per second consumers would use if this flow were unlimited; above capacity means a real shortage. */
  demand: number;
}

interface PowerReport {
  /** Solar output multiplier right now (0..1). */
  daylight: number;
  /** kW into accumulators (positive) or out of them (negative). */
  accumulatorFlow: number;
}

interface CombatReport {
  /** Pollution per second from machines. */
  emitted: number;
  /** Pollution per second the land absorbs; above it, the cloud grows and nests take notice. */
  landAbsorption: number;
  /** Pollution per second nests spend on attackers. */
  attackPollution: number;
  bitersPerSecond: number;
  /** Biter health arriving per second. */
  threat: number;
  /** Share of arriving biters the turrets kill (1 when nothing attacks). */
  killedShare: number;
  /** Damage per second biters that got through deal to walls and buildings. */
  damagePerSecond: number;
}

interface TickReport {
  units: UnitReport[];
  flows: Record<FlowId, FlowReport>;
  power: PowerReport;
  combat: CombatReport;
  /** Net per-second change from machines during the last tick. */
  rates: Amounts;
}

interface StatSample {
  tick: number;
  produced: Amounts;
  consumed: Amounts;
}

type StatTierId = "5s" | "1m" | "10m" | "1h" | "10h";

interface StatTier {
  /** Accumulates until this tier's next sample. */
  pending: StatSample;
  history: StatSample[];
}

interface Stats {
  /** Lifetime production, used by trigger technologies. */
  lifetime: Amounts;
  /** Lifetime consumption (machines and hand crafting). */
  lifetimeConsumed: Amounts;
  /** Accumulates the current tick, then is merged into every tier. */
  pending: StatSample;
  tiers: Record<StatTierId, StatTier>;
}

interface ResearchState {
  researched: TechId[];
  /** Factorio-style research queue; labs work on the head. */
  queue: TechId[];
  /** Research units done per tech; kept when a tech leaves the queue. */
  progress: Partial<Record<TechId, number>>;
}

interface RocketState {
  launches: number;
  /** Tick of the first launch: the game is won. */
  firstLaunchTick: number | null;
  /** The player has seen the victory screen. */
  acknowledged: boolean;
}

interface CombatState {
  /** Factorio's peaceful mode: biters never attack. */
  peaceful: boolean;
  /** The pollution cloud nests feed on. */
  pollution: number;
  /** Enemy evolution, 0..1: bigger biters as it rises. */
  evolution: number;
  /** Damage on walls and buildings not yet enough to destroy one; repair packs fix it. */
  wallDamage: number;
  buildingDamage: number;
  kills: number;
  /** Biter health your hand-fired magazines will still kill as biters arrive. */
  handFire: number;
  /** Buildings destroyed by biters, all time. */
  losses: Partial<Record<MachineId, number>>;
  lastLoss: { machine: MachineId; tick: number } | null;
}

interface GameState {
  tick: number;
  inventory: Record<ItemId, number>;
  machines: Record<MachineId, MachineState>;
  queue: CraftJob[];
  nextJobId: number;
  unlocked: Array<MachineId | RecipeId>;
  /** "Keep N in stock": machines stop producing an item once storage holds this many. */
  stockTargets: Partial<Record<ItemId, number>>;
  research: ResearchState;
  /** Energy stored in accumulators, in kJ. */
  storedEnergy: number;
  rocket: RocketState;
  combat: CombatState;
  stats: Stats;
  report: TickReport;
}

export type {
  CombatReport,
  CombatState,
  CraftJob,
  FlowReport,
  GameState,
  Limit,
  MachineState,
  PowerReport,
  ResearchState,
  RocketState,
  StatSample,
  Stats,
  StatTier,
  StatTierId,
  TickReport,
  UnitReport,
};
