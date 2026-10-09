import { describe, expect, it } from "vitest";
import { TICK_SECONDS } from "./catalog";
import {
  biterMix,
  damageAfterResistance,
  HAND_BUFFER_MAGAZINES,
  healthPerShot,
  incomingAttack,
  LAND_ABSORPTION,
  NEST_ABSORPTION,
  NEST_REACH,
  nestReach,
  shootByHand,
} from "./combat";
import { advance } from "./simulation";
import { runProduction } from "./production";
import { TECHNOLOGIES } from "./technologies";
import type { TechId } from "./technologies";
import { setup } from "./test-utils";
import type { GameState } from "./types";

const tick = (state: GameState, n = 1) => {
  for (let i = 0; i < n; i++) {
    runProduction(state, TICK_SECONDS);
    state.tick++;
  }
};
const research = (state: GameState, ...ids: TechId[]) => {
  state.research.researched.push(...ids);
  for (const id of ids) state.unlocked.push(...TECHNOLOGIES[id].unlocks);
};
/** Ticks with the attack held at `pollution` per second. */
const tickUnderAttack = (state: GameState, n: number, pollution = 2) => {
  for (let i = 0; i < n; i++) tick(underAttack(state, pollution));
};
const turrets = (state: GameState) => state.report.units.find((u) => u.machine === "gun-turret")!;

/** A cloud past the nests big enough for `pollution` per second of attacks, from a factory over the line. */
const underAttack = (state: GameState, pollution: number) => {
  state.combat.pollution = NEST_REACH + pollution / NEST_ABSORPTION;
  state.report.combat.emitted = LAND_ABSORPTION + 1;
  return state;
};

describe("biters", () => {
  it("evolve from small biters to behemoths", () => {
    const share = (evolution: number, id: string) => biterMix(evolution).find((m) => m.biter.id === id)!.share;
    expect(share(0, "small-biter")).toBe(1);
    expect(share(0.4, "medium-biter")).toBeCloseTo(0.15 / (0.1 + 0.15));
    expect(share(0.95, "behemoth-biter")).toBeGreaterThan(0);
    expect(share(0.95, "small-biter")).toBe(0);
  });

  it("take overkill and flat resistance into account", () => {
    const s = setup({});
    expect(healthPerShot(s, "shoot-firearm-magazine")).toBeCloseTo(15 / 3); // 3 shots per small biter
    expect(healthPerShot(s, "shoot-piercing-rounds-magazine")).toBeCloseTo(15 / 2);
    expect(healthPerShot(s, "shoot-laser")).toBe(15);
    // Medium biters' 4 flat resistance turns a 5-damage bullet into 0.9, an 8-damage one into 3.6.
    expect(damageAfterResistance(5, { decrease: 4, percent: 0.1 })).toBeCloseTo(0.9);
    expect(damageAfterResistance(8, { decrease: 4, percent: 0.1 })).toBeCloseTo(3.6);
    s.combat.evolution = 0.6;
    expect(healthPerShot(s, "shoot-piercing-rounds-magazine")).toBeGreaterThan(2 * healthPerShot(s, "shoot-firearm-magazine"));
  });
});

describe("pollution", () => {
  const drills = (count: number) =>
    setup({
      items: { coal: 100_000 },
      machines: { "burner-mining-drill": { count, allocations: { "mine-iron-ore": 1 } }, "iron-chest": { count: 1000 } },
    });

  it("is absorbed by the land up to a limit; only the excess reaches the nests", () => {
    const small = drills(10); // 2 pollution/s, under the land's 3/s
    tick(small, 600);
    expect(small.report.combat.emitted).toBeCloseTo(2);
    expect(small.combat.pollution).toBe(0);
    expect(small.report.combat.bitersPerSecond).toBe(0);

    const big = drills(50); // 10/s
    tick(big);
    expect(big.combat.pollution).toBeCloseTo((10 - LAND_ABSORPTION) * TICK_SECONDS);
    // 7/s drifts towards the nests: no attacks until the cloud reaches them, about 143 s in.
    tick(big, 1300);
    expect(nestReach(big)).toBeGreaterThan(0.9);
    expect(big.report.combat.bitersPerSecond).toBe(0);
    tick(big, 400);
    expect(big.report.combat.bitersPerSecond).toBeGreaterThan(0);
    expect(big.report.combat.attackPollution).toBeCloseTo((big.combat.pollution - NEST_REACH) * NEST_ABSORPTION, 1);
  });

  it("raises evolution over time and with pollution", () => {
    const s = drills(50);
    tick(s, 600);
    expect(s.combat.evolution).toBeGreaterThan(60 * 0.000004);
  });

  it("never brings attacks in peaceful mode", () => {
    const s = underAttack(drills(50), 10);
    s.combat.peaceful = true;
    tick(s, 100);
    expect(s.report.combat.bitersPerSecond).toBe(0);
  });
});

describe("defense", () => {
  const base = (magazines: number) => {
    const s = setup({
      items: { coal: 1000, "firearm-magazine": magazines },
      machines: {
        "burner-mining-drill": { count: 4, allocations: { "mine-iron-ore": 1 } },
        "gun-turret": { count: 2, allocations: { "shoot-firearm-magazine": 2 } },
      },
    });
    research(s, "gun-turret");
    return underAttack(s, 2); // 0.5 small biters/s = 7.5 HP/s
  };

  it("turrets shoot only as much as the attack needs", () => {
    const s = base(100);
    tick(s);
    expect(s.report.combat.killedShare).toBeCloseTo(1);
    // 7.5 HP/s at 5 HP per shot: 1.5 shots/s = 0.15 magazines/s, of 2 turrets' 2 magazines/s.
    expect(-s.report.rates["firearm-magazine"]!).toBeCloseTo(0.15, 2);
    expect(turrets(s).ratio).toBeCloseTo(0.15 / 2, 2);
    expect(s.report.combat.damagePerSecond).toBe(0);
  });

  it("biters get through without ammo: walls fall first, then the worst polluter", () => {
    const s = base(0);
    s.machines["stone-wall"].count = 1;
    s.machines["stone-furnace"].count = 5; // pollutes less than the drills
    tick(s);
    expect(s.report.combat.killedShare).toBe(0);
    expect(turrets(s).limit).toEqual({ resource: "firearm-magazine", side: "input" });
    // 0.5 small biters/s × 10 bites × 7 damage = 35 damage/s.
    expect(s.report.combat.damagePerSecond).toBeCloseTo(35);
    tickUnderAttack(s, 101); // 350 HP at 35 damage/s
    expect(s.machines["stone-wall"].count).toBe(0);
    tickUnderAttack(s, 100);
    expect(s.combat.losses["burner-mining-drill"]).toBe(1);
    tickUnderAttack(s, 100); // at most one building per 10 s
    expect(s.combat.losses["burner-mining-drill"]).toBe(2);
    expect(s.machines["stone-furnace"].count).toBe(5);
    expect(s.combat.lastLoss?.machine).toBe("burner-mining-drill");
  });

  it("repair packs patch walls", () => {
    const s = base(0);
    s.machines["stone-wall"].count = 10;
    s.inventory["repair-pack"] = 10;
    tickUnderAttack(s, 10); // 35 damage in a second, repaired as it lands
    expect(s.combat.wallDamage).toBeCloseTo(0);
    expect(s.inventory["repair-pack"]).toBeCloseTo(10 - 35 / 300, 2);
  });

  it("laser turrets draw power only while shooting", () => {
    const s = setup({
      items: { coal: 1000 },
      machines: { "offshore-pump": { count: 1 }, boiler: { count: 2 }, "steam-engine": { count: 4 }, "laser-turret": { count: 2 } },
    });
    research(s, "laser-turret");
    tick(s);
    expect(s.report.flows.electricity.produced).toBeCloseTo(0);
    underAttack(s, 4); // 1 small biter/s: one 20-damage shot each, of 3 shots/s
    tick(s);
    expect(s.report.combat.killedShare).toBeCloseTo(1);
    expect(s.report.flows.electricity.produced).toBeCloseTo((1 / 3) * 2 * 1200, 0);
  });

  it("research makes bullets hit harder", () => {
    const s = setup({});
    s.combat.evolution = 0.6;
    const before = healthPerShot(s, "shoot-piercing-rounds-magazine");
    research(s, "physical-projectile-damage-1", "physical-projectile-damage-2");
    expect(healthPerShot(s, "shoot-piercing-rounds-magazine")).toBeGreaterThan(before);
    expect(incomingAttack(s).health).toBe(0);
  });
});

describe("early game without turrets", () => {
  const burnerBase = (drills: number) => {
    const s = setup({
      items: { coal: 100_000, "firearm-magazine": 20 },
      machines: {
        "burner-mining-drill": { count: drills, allocations: { "mine-iron-ore": 1 } },
        "stone-furnace": { count: 10, allocations: { "iron-plate": 1 } },
        "iron-chest": { count: 1000 },
      },
    });
    s.inventory["iron-ore"] = 10_000;
    return s;
  };

  it("loses buildings only until the factory is back under the land's absorption", () => {
    const s = burnerBase(16); // 16 × 12 + 10 × 2 = 212/min, over the 180 the land absorbs
    advance(s, 40 * 600);
    // 13 drills (176/min) is the most it can run without attracting biters; then attacks stop.
    expect(s.machines["burner-mining-drill"].count).toBe(13);
    expect(s.report.combat.bitersPerSecond).toBe(0);
  });

  it("can hold biters off by hand with magazines", () => {
    const s = underAttack(burnerBase(16), 2); // 0.5 small biters/s
    tick(s);
    expect(s.report.combat.killedShare).toBe(0);
    for (let i = 0; i < 5; i++) shootByHand(s);
    // One magazine = 10 shots, 3 per small biter: 50 HP. The buffer holds 3 magazines.
    expect(s.inventory["firearm-magazine"]).toBe(20 - HAND_BUFFER_MAGAZINES);
    expect(s.combat.handFire).toBeCloseTo(150);
    tickUnderAttack(s, 1);
    expect(s.report.combat.killedShare).toBeCloseTo(1);
    expect(s.combat.handFire).toBeCloseTo(150 - 7.5 * TICK_SECONDS);
  });

  it("can't waste magazines when nothing attacks", () => {
    const s = burnerBase(4);
    tick(s);
    expect(shootByHand(s)).toBe(false);
    expect(s.inventory["firearm-magazine"]).toBe(20);
  });
});
