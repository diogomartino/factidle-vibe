import { isFlow } from "./catalog";
import type { ItemId, MachineId, RecipeId, ResourceId } from "./catalog";
import type { Limit } from "./types";

/** A machine type running one recipe: `scale` machines' worth of capacity. */
interface ProductionUnit {
  machine: MachineId;
  recipe: RecipeId;
  priority: number;
  scale: number;
  /** Per-second amounts at full speed for the whole unit (fuel and power included). */
  inputs: Array<[ResourceId, number]>;
  outputs: Array<[ResourceId, number]>;
}

interface SolveInput {
  units: ProductionUnit[];
  /** Items available at the start of the tick. */
  stock: (item: ItemId) => number;
  /** Room left for each item before its storage cap. */
  space: (item: ItemId) => number;
  dt: number;
}

interface SolveResult {
  /** Speed of each unit as a fraction of full speed (0..1). */
  ratios: number[];
  /**
   * Speed each unit would run at if every flow it consumes were unlimited
   * (still bound by items and storage). Flow demand = these x the unit's flow inputs.
   */
  demands: number[];
  limits: Array<Limit | null>;
}

interface Claim {
  unit: number;
  priority: number;
  perSecond: number;
}

interface ResourceClaims {
  consumers: Claim[];
  producers: Claim[];
}

const EPSILON = 1e-9;
/** Lets stalled units ask for a share again so freed-up resources get redistributed. */
const MIN_REQUEST = 0.001;
const REDISTRIBUTE_PASSES = 32;
const MAX_SETTLE_PASSES = 100;

const indexClaims = (units: ProductionUnit[]) => {
  const index = new Map<ResourceId, ResourceClaims>();
  const claimsOf = (id: ResourceId) => {
    let claims = index.get(id);
    if (!claims) index.set(id, (claims = { consumers: [], producers: [] }));
    return claims;
  };
  units.forEach((u, unit) => {
    for (const [id, perSecond] of u.inputs) claimsOf(id).consumers.push({ unit, priority: u.priority, perSecond });
    for (const [id, perSecond] of u.outputs) claimsOf(id).producers.push({ unit, priority: u.priority, perSecond });
  });
  // Stable sort keeps catalog order inside a priority tier.
  for (const claims of index.values()) {
    claims.consumers.sort((a, b) => b.priority - a.priority);
    claims.producers.sort((a, b) => b.priority - a.priority);
  }
  return index;
};

const total = (claims: Claim[], speeds: number[], dt: number) =>
  claims.reduce((sum, c) => sum + speeds[c.unit]! * c.perSecond * dt, 0);

/**
 * Splits `available` between claims: higher priority tiers are served first,
 * claims within a tier get the same ratio. Calls `onRatio` with each claim's
 * ratio of available-to-requested (may exceed 1 when there is surplus).
 */
const shareByPriority = (
  claims: Claim[],
  requests: number[],
  available: number,
  dt: number,
  onRatio: (unit: number, ratio: number) => void,
) => {
  let remaining = available;
  for (let start = 0; start < claims.length; ) {
    let end = start;
    while (end < claims.length && claims[end]!.priority === claims[start]!.priority) end++;
    const tier = claims.slice(start, end);
    const requested = total(tier, requests, dt);
    const ratio = requested > EPSILON ? remaining / requested : remaining > EPSILON ? Infinity : 0;
    for (const c of tier) onRatio(c.unit, ratio);
    remaining = Math.max(0, remaining - requested);
    start = end;
  }
};

/**
 * Finds how fast every unit can run this tick.
 *
 * Items are limited by stock (inputs) and storage room (outputs). Flows have
 * no stock, so each unit tracks two speeds:
 * - `can`: what supply allows. Flow supply is pushed forward from producers'
 *   `can`, e.g. pump -> boiler -> engine -> electric drill.
 * - `want`: what demand allows. Flow demand is pulled back from consumers'
 *   `want`, so engines only burn steam for power that is actually used.
 * A unit runs at min(can, want), and whichever side is lower names the limit.
 *
 * Item shares are requested at the current speed and may grow when others
 * stall, so freed resources get redistributed. A final pass only lowers
 * speeds until nothing is over-consumed.
 */
const solveProduction = ({ units, stock, space, dt }: SolveInput): SolveResult => {
  const index = indexClaims(units);
  const ones = () => units.map(() => 1);
  const floored = (speeds: number[]) => speeds.map((s) => Math.max(s, MIN_REQUEST));
  let can = ones();
  let want = ones();
  let speeds = ones();
  let canLimits: Array<Limit | null> = [];
  let wantLimits: Array<Limit | null> = [];

  const redistribute = () => {
    const nextCan = ones();
    const nextWant = ones();
    canLimits = units.map(() => null);
    wantLimits = units.map(() => null);
    const bound = (target: number[], limits: Array<Limit | null>, unit: number, value: number, limit: Limit) => {
      if (value >= target[unit]!) return;
      target[unit] = value;
      limits[unit] = limit;
    };
    const itemRequests = floored(speeds);
    const canRequests = floored(can);
    const wantRequests = floored(want);
    const limitBy = (requests: number[], ratio: number, unit: number) => (ratio === Infinity ? Infinity : requests[unit]! * ratio);

    for (const [resource, { consumers, producers }] of index) {
      const input: Limit = { resource, side: "input" };
      const output: Limit = { resource, side: "output" };
      if (isFlow(resource)) {
        shareByPriority(consumers, wantRequests, total(producers, can, dt), dt, (unit, ratio) =>
          bound(nextCan, canLimits, unit, limitBy(wantRequests, ratio, unit), input),
        );
        shareByPriority(producers, canRequests, total(consumers, want, dt), dt, (unit, ratio) =>
          bound(nextWant, wantLimits, unit, limitBy(canRequests, ratio, unit), output),
        );
        continue;
      }
      const both = (limit: Limit) => (unit: number, ratio: number) => {
        const value = limitBy(itemRequests, ratio, unit);
        bound(nextCan, canLimits, unit, value, limit);
        bound(nextWant, wantLimits, unit, value, limit);
      };
      shareByPriority(consumers, itemRequests, stock(resource as ItemId), dt, both(input));
      shareByPriority(producers, itemRequests, Math.max(0, space(resource as ItemId)), dt, both(output));
    }

    const next = nextCan.map((c, i) => Math.min(c, nextWant[i]!));
    const change = Math.max(0, ...next.map((s, i) => Math.abs(s - speeds[i]!)));
    can = nextCan;
    want = nextWant;
    speeds = next;
    return change;
  };

  const settle = () => {
    const next = [...speeds];
    for (const [resource, { consumers, producers }] of index) {
      const flow = isFlow(resource);
      const supply = flow ? total(producers, speeds, dt) : stock(resource as ItemId);
      const room = flow ? total(consumers, speeds, dt) : Math.max(0, space(resource as ItemId));
      const lower = (unit: number, ratio: number) => {
        next[unit] = Math.min(next[unit]!, speeds[unit]! * Math.min(1, ratio));
      };
      shareByPriority(consumers, speeds, supply, dt, lower);
      shareByPriority(producers, speeds, room, dt, lower);
    }
    const change = Math.max(0, ...next.map((s, i) => speeds[i]! - s));
    speeds = next;
    return change;
  };

  for (let i = 0; i < REDISTRIBUTE_PASSES && redistribute() > EPSILON; i++);
  for (let i = 0; i < MAX_SETTLE_PASSES && settle() > EPSILON; i++);

  return {
    ratios: speeds,
    demands: want,
    limits: speeds.map((s, i) => {
      if (s >= 1 - 1e-6) return null;
      return can[i]! <= want[i]! ? canLimits[i]! : wantLimits[i]!;
    }),
  };
};

export { solveProduction };
export type { ProductionUnit, SolveInput, SolveResult };
