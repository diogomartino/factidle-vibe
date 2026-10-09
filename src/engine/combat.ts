import { MACHINE_IDS, MACHINES } from "./catalog";
import type { MachineId, RecipeId } from "./catalog";
import { techBonus } from "./research";
import { addAmount, snap } from "./inventory";
import type { ProductionUnit } from "./solver";
import type { CombatReport, GameState } from "./types";

/**
 * Idle combat, after Factorio 2.0 (values from its base game data):
 * - Machines emit pollution. The land absorbs a fixed amount; the rest drifts into a cloud.
 * - The cloud has to reach the nests first (NEST_REACH), standing in for Factorio's pollution
 *   drifting chunk by chunk: a warning period that's shorter the more you pollute.
 * - Nests then absorb 1% of the cloud beyond that per second, but only while the factory
 *   pollutes more than the land absorbs, and spend it on attackers picked by evolution:
 *   small biters cost 4 pollution, behemoths 400.
 * - Turrets produce "firepower" (biter health removed per second) in the solver, demand-driven
 *   like steam engines: they only shoot, and use ammo or power, when biters arrive.
 * - Biters the turrets miss bite walls, then the buildings polluting the most.
 */

type BiterId = "small-biter" | "medium-biter" | "big-biter" | "behemoth-biter";

interface BiterDef {
  id: BiterId;
  name: string;
  health: number;
  /** Damage per bite. */
  damage: number;
  /** Pollution a nest spends to send one. */
  cost: number;
  /** Physical resistance: flat decrease, then percent. Biters have none against lasers. */
  physical: { decrease: number; percent: number };
  /** Spawn weight by evolution: linear between points, flat beyond the ends. */
  weights: Array<[number, number]>;
}

const BITERS: BiterDef[] = [
  { id: "small-biter", name: "Small biter", health: 15, damage: 7, cost: 4, physical: { decrease: 0, percent: 0 }, weights: [[0, 0.3], [0.6, 0]] },
  {
    id: "medium-biter",
    name: "Medium biter",
    health: 75,
    damage: 15,
    cost: 20,
    physical: { decrease: 4, percent: 0.1 },
    weights: [[0.2, 0], [0.6, 0.3], [0.7, 0.1]],
  },
  { id: "big-biter", name: "Big biter", health: 375, damage: 30, cost: 80, physical: { decrease: 8, percent: 0.1 }, weights: [[0.5, 0], [1, 0.4]] },
  {
    id: "behemoth-biter",
    name: "Behemoth biter",
    health: 3000,
    damage: 90,
    cost: 400,
    physical: { decrease: 12, percent: 0.1 },
    weights: [[0.9, 0], [1, 0.3]],
  },
];

/** Pollution the land around the factory absorbs per second (the abstraction of Factorio's terrain). */
const LAND_ABSORPTION = 3;
/** Cloud size at which pollution reaches the nests and attacks begin. */
const NEST_REACH = 1000;
/** Share of the cloud beyond NEST_REACH nests absorb per second (a spawner's proportional absorption). */
const NEST_ABSORPTION = 0.01;
/** Evolution per second and per unit of pollution produced (Factorio default map settings). */
const EVOLUTION_TIME_FACTOR = 0.000004;
const EVOLUTION_POLLUTION_FACTOR = 0.0000009;
/** Bites a biter gets in once past the turrets, before something kills it. */
const BITES_PER_LEAK = 10;
/**
 * At most one building is lost per 10 s; damage beyond one building's worth is wasted on the
 * rubble. Keeps an idle player from coming back to nothing, while walls still take every hit.
 */
const LOSS_COOLDOWN_TICKS = 100;
/**
 * Shooting by hand (Factorio's pistol and submachine gun): each shot spends a whole magazine,
 * and the damage waits in a buffer that kills biters as they arrive. The buffer holds at most
 * this many magazines' worth, so clicking ahead doesn't stockpile.
 */
const HAND_BUFFER_MAGAZINES = 3;
const MAGAZINE_SIZE = 10;
/** A repair pack restores 300 HP; repairs go at most this fast. */
const REPAIR_PACK_HP = 300;
const REPAIR_HP_PER_SECOND = 120;

/** Shots per second at speed 1 and damage per shot, before research. */
const WEAPONS: Partial<Record<RecipeId, { damage: number; kind: "bullet" | "laser" }>> = {
  "shoot-firearm-magazine": { damage: 5, kind: "bullet" },
  "shoot-piercing-rounds-magazine": { damage: 8, kind: "bullet" },
  "shoot-laser": { damage: 20, kind: "laser" },
};

const weightAt = (points: Array<[number, number]>, evolution: number) => {
  if (evolution <= points[0]![0]) return points[0]![1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (evolution <= x1) return y0 + ((y1 - y0) * (evolution - x0)) / (x1 - x0);
  }
  return points.at(-1)![1];
};

/** Share of attacking biters of each type (by count) at an evolution factor. */
const biterMix = (evolution: number) => {
  const weights = BITERS.map((b) => weightAt(b.weights, evolution));
  const total = weights.reduce((a, b) => a + b, 0);
  return BITERS.map((biter, i) => ({ biter, share: weights[i]! / total }));
};

/** Factorio's resistance formula: flat decrease (never below a sliver), then percent. */
const damageAfterResistance = (damage: number, { decrease, percent }: BiterDef["physical"]) =>
  (damage > decrease ? damage - decrease : 1 / (2 + decrease - damage)) * (1 - percent);

/** Damage of one shot after research, before resistances. Gun turret damage research doesn't apply by hand. */
const shotDamage = (state: GameState, recipe: RecipeId, byHand: boolean) => {
  const weapon = WEAPONS[recipe]!;
  if (weapon.kind === "laser") return weapon.damage * (1 + techBonus(state, "laserDamage"));
  const turret = byHand ? 1 : 1 + techBonus(state, "gunTurretDamage");
  return weapon.damage * (1 + techBonus(state, "bulletDamage")) * turret;
};

/**
 * Biter health one shot removes on average against the current mix, counting overkill:
 * a 5-damage bullet needs 3 shots for a 15 HP small biter, and flat resistance makes weak
 * ammo nearly useless against bigger biters, as in Factorio.
 */
const healthPerShot = (state: GameState, recipe: RecipeId, byHand = false) => {
  const weapon = WEAPONS[recipe];
  if (!weapon) return 1;
  const damage = shotDamage(state, recipe, byHand);
  let health = 0;
  let shots = 0;
  for (const { biter, share } of biterMix(state.combat.evolution)) {
    const perShot = weapon.kind === "laser" ? damage : damageAfterResistance(damage, biter.physical);
    health += share * biter.health;
    shots += share * Math.ceil(biter.health / perShot - 1e-9);
  }
  return shots > 0 ? health / shots : 0;
};

/**
 * Pollution nests spend on attacks per second: none in peaceful mode, none until the cloud
 * reaches them, and none while the factory (last tick) pollutes less than the land absorbs,
 * so cutting back below the line ends the attacks instead of leaving a cloud to feed them.
 */
const attackPollution = (state: GameState) => {
  if (state.combat.peaceful || state.report.combat.emitted <= LAND_ABSORPTION) return 0;
  return Math.max(0, state.combat.pollution - NEST_REACH) * NEST_ABSORPTION;
};

/** How far the cloud has drifted towards the nests, 0..1; at 1 attacks begin. */
const nestReach = (state: GameState) => Math.min(1, state.combat.pollution / NEST_REACH);

/** Biters arriving per second, by type, and the biter health per second they bring. */
const incomingAttack = (state: GameState) => {
  const pollution = attackPollution(state);
  const mix = biterMix(state.combat.evolution);
  const costPerBiter = mix.reduce((sum, { biter, share }) => sum + share * biter.cost, 0);
  const biters = mix.map(({ biter, share }) => ({ biter, perSecond: (pollution * share) / costPerBiter }));
  return { biters, health: biters.reduce((sum, b) => sum + b.perSecond * b.biter.health, 0) };
};

/**
 * The incoming biters for one tick. Hand-fired damage kills what it can first; the rest is a
 * solver unit consuming turret firepower, whose speed is the share the turrets kill.
 */
const attackUnit = (state: GameState, dt: number): { unit: ProductionUnit | null; byHand: number } => {
  const { health } = incomingAttack(state);
  const byHand = Math.min(state.combat.handFire, health * dt);
  const rest = health - byHand / dt;
  if (rest <= 1e-9) return { unit: null, byHand };
  // Lowest priority: turrets defend after every machine has taken its power.
  return { unit: { machine: "stone-wall", recipe: "biter-attack", priority: -1000, scale: 1, inputs: [["firepower", rest]], outputs: [] }, byHand };
};

/** The magazine you shoot by hand (piercing rounds when you have them) and the biter health it kills. */
const handMagazine = (state: GameState) => {
  const piercing = state.inventory["piercing-rounds-magazine"] >= 1;
  const item = piercing ? ("piercing-rounds-magazine" as const) : ("firearm-magazine" as const);
  const damage = MAGAZINE_SIZE * healthPerShot(state, piercing ? "shoot-piercing-rounds-magazine" : "shoot-firearm-magazine", true);
  return { item, damage, capacity: HAND_BUFFER_MAGAZINES * damage };
};

/** Shoots one magazine by hand. Only while biters attack, and not past the buffer. Returns whether it fired. */
const shootByHand = (state: GameState) => {
  if (state.report.combat.bitersPerSecond <= 0) return false;
  const { item: magazine, damage, capacity } = handMagazine(state);
  if (state.inventory[magazine] < 1 || state.combat.handFire + damage > capacity) return false;
  state.inventory[magazine] -= 1;
  state.combat.handFire += damage;
  addAmount(state.stats.pending.consumed, magazine, 1);
  return true;
};

/** Biters target whatever pollutes most; with nothing running, the dirtiest building type owned. */
const pollutionTarget = (state: GameState, emissions: Partial<Record<MachineId, number>>): MachineId | null => {
  const owned = MACHINE_IDS.filter((id) => state.machines[id].count > 0 && (MACHINES[id].pollution ?? 0) > 0);
  const score = (id: MachineId) => emissions[id] ?? 0;
  const byEmission = owned.filter((id) => score(id) > 0).sort((a, b) => score(b) - score(a));
  if (byEmission.length > 0) return byEmission[0]!;
  return owned.sort((a, b) => MACHINES[b].pollution! * state.machines[b].count - MACHINES[a].pollution! * state.machines[a].count)[0] ?? null;
};

/** Removes one building, with any module or recipe assignments it no longer has room for. */
const destroyBuilding = (state: GameState, id: MachineId) => {
  const machine = state.machines[id];
  const count = machine.count - 1;
  const allocations = { ...machine.allocations };
  if (MACHINES[id].wholeMachines) {
    let excess = Object.values(allocations).reduce((a, b) => a + b, 0) - count;
    for (const recipe of (Object.keys(allocations) as RecipeId[]).reverse()) {
      if (excess <= 0) break;
      const cut = Math.min(excess, allocations[recipe]!);
      allocations[recipe]! -= cut;
      excess -= cut;
      if (allocations[recipe] === 0) delete allocations[recipe];
    }
  }
  // Modules in the destroyed building are lost with it.
  const modules = { ...machine.modules };
  let excessModules = Object.values(modules).reduce((a, b) => a + b, 0) - (MACHINES[id].moduleSlots ?? 0) * count;
  for (const module of Object.keys(modules) as Array<keyof typeof modules>) {
    if (excessModules <= 0) break;
    const cut = Math.min(excessModules, modules[module]!);
    modules[module]! -= cut;
    excessModules -= cut;
    if (modules[module] === 0) delete modules[module];
  }
  // Replaced, not mutated: ticks share machines with the previous state.
  state.machines = { ...state.machines, [id]: { ...machine, count, allocations, modules } };
  state.combat.losses = { ...state.combat.losses, [id]: (state.combat.losses[id] ?? 0) + 1 };
  state.combat.lastLoss = { machine: id, tick: state.tick };
};

/**
 * Applies one tick of combat after production: kills, damage from biters that got through
 * (walls first, then polluters), repairs, the pollution cloud and evolution.
 */
const resolveCombat = (
  state: GameState,
  turretShare: number,
  byHand: number,
  emitted: number,
  emissions: Partial<Record<MachineId, number>>,
  dt: number,
) => {
  const combat = { ...state.combat };
  state.combat = combat;
  const attack = incomingAttack(state);
  // Hand-fired damage took its part of this tick's biters; turrets got a share of the rest.
  const arriving = attack.health * dt;
  combat.handFire = snap(combat.handFire - byHand);
  const killedShare = arriving > 0 ? (byHand + (arriving - byHand) * turretShare) / arriving : 1;
  const leaked = 1 - killedShare;
  const damage = attack.biters.reduce((sum, b) => sum + b.perSecond * leaked * b.biter.damage * BITES_PER_LEAK, 0) * dt;
  combat.kills = snap(combat.kills + attack.biters.reduce((sum, b) => sum + b.perSecond * killedShare, 0) * dt);

  // Walls take the hits first; each full wall's worth of damage knocks one down.
  const wallHealth = MACHINES["stone-wall"].health;
  let wallDamage = combat.wallDamage + damage;
  let overflow = 0;
  while (wallDamage >= wallHealth && state.machines["stone-wall"].count > 0) {
    wallDamage -= wallHealth;
    destroyBuilding(state, "stone-wall");
  }
  if (state.machines["stone-wall"].count === 0) {
    overflow = wallDamage;
    wallDamage = 0;
  }

  // Then the building polluting most, at most one per cooldown.
  let buildingDamage = combat.buildingDamage + overflow;
  const target = pollutionTarget(state, emissions);
  if (target) {
    buildingDamage = Math.min(buildingDamage, MACHINES[target].health);
    const ready = !combat.lastLoss || state.tick - combat.lastLoss.tick >= LOSS_COOLDOWN_TICKS || combat.lastLoss.machine === "stone-wall";
    if (buildingDamage >= MACHINES[target].health && ready) {
      buildingDamage = 0;
      destroyBuilding(state, target);
    }
  }

  // Repair packs patch walls, then buildings.
  let repair = Math.min(wallDamage + buildingDamage, REPAIR_HP_PER_SECOND * dt, state.inventory["repair-pack"] * REPAIR_PACK_HP);
  state.inventory["repair-pack"] = snap(state.inventory["repair-pack"] - repair / REPAIR_PACK_HP);
  const wallRepair = Math.min(wallDamage, repair);
  wallDamage -= wallRepair;
  repair -= wallRepair;
  buildingDamage -= Math.min(buildingDamage, repair);
  combat.wallDamage = snap(wallDamage);
  combat.buildingDamage = snap(buildingDamage);

  // The cloud: emissions in, land absorbs a fixed amount, nests take their share.
  const absorbed = Math.min(combat.pollution + emitted * dt, LAND_ABSORPTION * dt);
  combat.pollution = snap(Math.max(0, combat.pollution + emitted * dt - absorbed - attackPollution(state) * dt));
  combat.evolution += (EVOLUTION_TIME_FACTOR * dt + EVOLUTION_POLLUTION_FACTOR * emitted * dt) * (1 - combat.evolution);

  const report: CombatReport = {
    emitted,
    landAbsorption: LAND_ABSORPTION,
    attackPollution: attackPollution(state),
    bitersPerSecond: attack.biters.reduce((sum, b) => sum + b.perSecond, 0),
    threat: attack.health,
    killedShare: attack.health > 0 ? killedShare : 1,
    damagePerSecond: damage / dt,
  };
  return report;
};

const emptyCombatReport = (): CombatReport => ({
  emitted: 0,
  landAbsorption: LAND_ABSORPTION,
  attackPollution: 0,
  bitersPerSecond: 0,
  threat: 0,
  killedShare: 1,
  damagePerSecond: 0,
});

export {
  attackPollution,
  attackUnit,
  BITERS,
  biterMix,
  BITES_PER_LEAK,
  damageAfterResistance,
  emptyCombatReport,
  healthPerShot,
  incomingAttack,
  HAND_BUFFER_MAGAZINES,
  handMagazine,
  LAND_ABSORPTION,
  NEST_ABSORPTION,
  NEST_REACH,
  nestReach,
  REPAIR_PACK_HP,
  resolveCombat,
  shootByHand,
  WEAPONS,
};
export type { BiterDef, BiterId };
