import { describe, expect, it } from "vitest";
import { ITEM_IDS } from "./catalog";
import { produceCapped } from "./inventory";
import { canQueue, dequeueResearch, queueResearch, techStatus } from "./research";
import { advance, createNewGame } from "./simulation";
import type { TechId } from "./technologies";
import type { GameState } from "./types";
import { isUnlocked } from "./unlocks";

const researched = (s: GameState, ...ids: TechId[]) => s.research.researched.push(...ids);

/** A powered research setup: `labs` labs, plenty of power unless `engines` says otherwise. */
const labSetup = (labs: number, engines = 2): GameState => {
  const s = createNewGame();
  for (const id of ITEM_IDS) s.inventory[id] = 0;
  s.machines["iron-chest"].count = 50;
  s.inventory.coal = 1000;
  s.inventory["automation-science-pack"] = 1000;
  s.machines["offshore-pump"].count = 1;
  s.machines.boiler.count = 1;
  s.machines["steam-engine"].count = engines;
  s.machines.lab.count = labs;
  researched(s, "steam-power", "electronics", "automation-science-pack");
  return s;
};

describe("trigger technologies", () => {
  it("researches Steam power after producing 50 iron plates", () => {
    const s = createNewGame();
    expect(isUnlocked(s, "boiler")).toBe(false);
    for (let i = 0; i < 49; i++) produceCapped(s, "iron-plate", 1);
    advance(s, 1);
    expect(techStatus(s, "steam-power")).toBe("locked");
    produceCapped(s, "iron-plate", 1);
    advance(s, 1);
    expect(techStatus(s, "steam-power")).toBe("researched");
    expect(isUnlocked(s, "boiler")).toBe(true);
    expect(isUnlocked(s, "pipe")).toBe(true);
  });

  it("waits for prerequisites before triggering", () => {
    const s = createNewGame();
    s.stats.lifetime.lab = 1;
    advance(s, 1);
    expect(techStatus(s, "automation-science-pack")).toBe("locked");
    researched(s, "steam-power", "electronics");
    advance(s, 1);
    expect(techStatus(s, "automation-science-pack")).toBe("researched");
    expect(isUnlocked(s, "automation-science-pack")).toBe(true);
  });
});

describe("research queue", () => {
  it("cannot queue lab research behind an unfinished trigger tech", () => {
    const s = createNewGame();
    expect(canQueue(s, "automation")).toBe(false);
    queueResearch(s, "automation");
    expect(s.research.queue).toEqual([]);
  });

  it("queues missing prerequisites first and removes dependents together", () => {
    const s = labSetup(1);
    queueResearch(s, "advanced-material-processing");
    expect(s.research.queue).toEqual(["steel-processing", "logistic-science-pack", "advanced-material-processing"]);
    queueResearch(s, "automation");
    dequeueResearch(s, "steel-processing");
    expect(s.research.queue).toEqual(["logistic-science-pack", "automation"]);
  });
});

describe("labs", () => {
  it("researches Automation in 100 s with one lab, using 10 packs and 60 kW", () => {
    const s = labSetup(1);
    queueResearch(s, "automation");
    advance(s, 10);
    expect(s.report.flows.electricity.produced).toBeCloseTo(60);
    advance(s, 989);
    expect(techStatus(s, "automation")).toBe("queued");
    advance(s, 2);
    expect(techStatus(s, "automation")).toBe("researched");
    expect(isUnlocked(s, "assembling-machine-1")).toBe(true);
    expect(1000 - s.inventory["automation-science-pack"]).toBeCloseTo(10, 1);
  });

  it("idles without a research and draws no power", () => {
    const s = labSetup(4);
    advance(s, 10);
    expect(s.report.flows.electricity.produced).toBe(0);
    expect(s.inventory["automation-science-pack"]).toBe(1000);
  });

  it("stalls without science packs and names them as the limit", () => {
    const s = labSetup(2);
    s.inventory["automation-science-pack"] = 0;
    queueResearch(s, "automation");
    advance(s, 10);
    const lab = s.report.units.find((u) => u.machine === "lab")!;
    expect(lab.ratio).toBe(0);
    expect(lab.limit).toEqual({ resource: "automation-science-pack", side: "input" });
    expect(s.research.progress.automation ?? 0).toBe(0);
  });

  it("slows down on low power like any electric machine", () => {
    const s = labSetup(30, 1); // 1.8 MW of labs on a 900 kW engine
    queueResearch(s, "steel-processing");
    advance(s, 10);
    const lab = s.report.units.find((u) => u.machine === "lab")!;
    expect(lab.ratio).toBeCloseTo(0.5);
    expect(lab.limit).toEqual({ resource: "electricity", side: "input" });
    // 30 labs at 50% for 1 s on a 5 s unit = 3 units
    expect(s.research.progress["steel-processing"]).toBeCloseTo(3);
  });

  it("needs both packs for Advanced material processing", () => {
    const s = labSetup(1);
    researched(s, "steel-processing", "logistic-science-pack");
    queueResearch(s, "advanced-material-processing");
    advance(s, 10);
    expect(s.report.units.find((u) => u.machine === "lab")!.limit).toEqual({ resource: "logistic-science-pack", side: "input" });
    s.inventory["logistic-science-pack"] = 100;
    advance(s, 300);
    expect(s.research.progress["advanced-material-processing"]).toBeCloseTo(1); // 30 s at 30 s per unit
  });
});
