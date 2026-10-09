import type { ItemId } from "./catalog";
import type { UnlockId } from "./unlocks";

type TechId =
  | "steam-power"
  | "electronics"
  | "automation-science-pack"
  | "automation"
  | "electric-mining-drill"
  | "steel-processing"
  | "steel-axe"
  | "logistic-science-pack"
  | "advanced-material-processing"
  | "automation-2"
  | "engine"
  | "solar-energy"
  | "research-speed-1"
  | "research-speed-2"
  | "fluid-handling"
  | "oil-gathering"
  | "oil-processing"
  | "plastics"
  | "sulfur-processing"
  | "advanced-circuit"
  | "battery"
  | "electric-energy-accumulators"
  | "concrete"
  | "railway"
  | "speed-module"
  | "productivity-module"
  | "efficiency-module"
  | "mining-productivity-1"
  | "chemical-science-pack"
  | "advanced-oil-processing"
  | "lubricant"
  | "electric-engine"
  | "processing-unit"
  | "low-density-structure"
  | "robotics"
  | "rocket-fuel"
  | "advanced-material-processing-2"
  | "research-speed-3"
  | "research-speed-4"
  | "mining-productivity-2"
  | "speed-module-2"
  | "productivity-module-2"
  | "efficiency-module-2"
  | "production-science-pack"
  | "utility-science-pack"
  | "automation-3"
  | "speed-module-3"
  | "productivity-module-3"
  | "efficiency-module-3"
  | "research-speed-5"
  | "research-speed-6"
  | "mining-productivity-3"
  | "rocket-silo"
  | "gun-turret"
  | "stone-wall"
  | "repair-pack"
  | "military-2"
  | "military-science-pack"
  | "laser-turret"
  | `physical-projectile-damage-${1 | 2 | 3 | 4 | 5 | 6}`
  | `weapon-shooting-speed-${1 | 2 | 3 | 4 | 5 | 6}`
  | `laser-weapons-damage-${1 | 2 | 3 | 4 | 5 | 6}`
  | `laser-shooting-speed-${1 | 2 | 3 | 4 | 5 | 6 | 7}`;

type SciencePackId =
  | "automation-science-pack"
  | "logistic-science-pack"
  | "chemical-science-pack"
  | "production-science-pack"
  | "utility-science-pack"
  | "military-science-pack";

/**
 * Bonuses granted by research: mining productivity, lab speed, extra ore per manual mining action,
 * and weapon damage and shooting speed. Physical projectile damage raises both bullet damage and
 * gun turret damage, which multiply, as in Factorio.
 */
type TechBonus =
  | "miningProductivity"
  | "labSpeed"
  | "manualMining"
  | "bulletDamage"
  | "gunTurretDamage"
  | "bulletSpeed"
  | "laserDamage"
  | "laserSpeed";

/** Factorio 2.0 trigger technology: researched by producing an item, no labs needed. */
interface TriggerCost {
  kind: "trigger";
  item: ItemId;
  amount: number;
}

/** Lab research: `count` units, each taking `time` seconds and one of every pack. */
interface ResearchCost {
  kind: "research";
  count: number;
  time: number;
  packs: SciencePackId[];
}

interface TechDef {
  id: TechId;
  name: string;
  icon: string;
  prerequisites: TechId[];
  unlocks: UnlockId[];
  cost: TriggerCost | ResearchCost;
  bonus?: Partial<Record<TechBonus, number>>;
}

const techIcon = (name: string) => `https://wiki.factorio.com/images/${encodeURIComponent(`${name.replaceAll(" ", "_")}_(research)`)}.png`;

/** `iconName` overrides the wiki icon name, e.g. one icon shared by every level. */
const tech = ({ iconName, ...def }: Omit<TechDef, "icon"> & { iconName?: string }): TechDef => ({ ...def, icon: techIcon(iconName ?? def.name) });

const RED: SciencePackId[] = ["automation-science-pack"];
const RG: SciencePackId[] = [...RED, "logistic-science-pack"];
const RGB: SciencePackId[] = [...RG, "chemical-science-pack"];
const RGBP: SciencePackId[] = [...RGB, "production-science-pack"];
const RGBPU: SciencePackId[] = [...RGBP, "utility-science-pack"];
const RGM: SciencePackId[] = [...RG, "military-science-pack"];
const RGMB: SciencePackId[] = [...RGM, "chemical-science-pack"];
const RGMBU: SciencePackId[] = [...RGMB, "utility-science-pack"];

const research = (count: number, time: number, packs: SciencePackId[]): ResearchCost => ({ kind: "research", count, time, packs });

/** Module techs come in three tiers per kind with the same costs. */
const moduleTechs = <K extends "speed" | "productivity" | "efficiency">(kind: K, name: string) => {
  const id = `${kind}-module` as `${K}-module`;
  const techs = {
    [id]: tech({ id, name, prerequisites: ["advanced-circuit"], unlocks: [id], cost: research(50, 30, RG) }),
    [`${id}-2`]: tech({
      id: `${id}-2`,
      name: `${name} 2`,
      prerequisites: [id, "processing-unit"],
      unlocks: [`${id}-2`],
      cost: research(75, 30, RGB),
    }),
    [`${id}-3`]: tech({
      id: `${id}-3`,
      name: `${name} 3`,
      prerequisites: [`${id}-2`, "production-science-pack"],
      unlocks: [`${id}-3`],
      cost: research(300, 60, RGBP),
    }),
  };
  return techs as Record<`${K}-module` | `${K}-module-2` | `${K}-module-3`, TechDef>;
};

const researchSpeed = (level: number, prerequisites: TechId[], count: number, packs: SciencePackId[], labSpeed: number) =>
  tech({
    id: `research-speed-${level}` as TechId,
    name: `Lab research speed ${level}`,
    iconName: "Lab research speed",
    prerequisites,
    unlocks: [],
    cost: research(count, 30, packs),
    bonus: { labSpeed },
  });

/** A leveled bonus tech: level N needs level N-1 plus `extra` prerequisites. */
const leveled = (
  base: string,
  name: string,
  level: number,
  extra: TechId[],
  count: number,
  time: number,
  packs: SciencePackId[],
  bonus: Partial<Record<TechBonus, number>>,
  first: TechId[] = [],
) =>
  tech({
    id: `${base}-${level}` as TechId,
    name: `${name} ${level}`,
    iconName: name,
    prerequisites: [...(level > 1 ? [`${base}-${level - 1}` as TechId] : first), ...extra],
    unlocks: [],
    cost: research(count, time, packs),
    bonus,
  });

const physicalDamage = (level: number, extra: TechId[], packs: SciencePackId[], bonus: number) =>
  leveled("physical-projectile-damage", "Physical projectile damage", level, extra, 100 * level, level > 2 ? 60 : 30, packs, {
    bulletDamage: bonus,
    gunTurretDamage: bonus,
  }, ["gun-turret"]);

const shootingSpeed = (level: number, extra: TechId[], packs: SciencePackId[], bonus: number) =>
  leveled("weapon-shooting-speed", "Weapon shooting speed", level, extra, 100 * level, level > 2 ? 60 : 30, packs, { bulletSpeed: bonus }, [
    "gun-turret",
  ]);

const laserDamage = (level: number, extra: TechId[], packs: SciencePackId[], bonus: number) =>
  leveled("laser-weapons-damage", "Laser weapons damage", level, extra, 100 * level, level > 2 ? 60 : 30, packs, { laserDamage: bonus }, [
    "laser-turret",
  ]);

const laserSpeed = (level: number, extra: TechId[], count: number, packs: SciencePackId[], bonus: number) =>
  leveled("laser-shooting-speed", "Laser shooting speed", level, extra, count, level > 2 ? 60 : 30, packs, { laserSpeed: bonus }, [
    "laser-turret",
  ]);

const miningProductivity = (level: number, prerequisites: TechId[], count: number, packs: SciencePackId[]) =>
  tech({
    id: `mining-productivity-${level}` as TechId,
    name: `Mining productivity ${level}`,
    iconName: "Mining productivity",
    prerequisites,
    unlocks: [],
    cost: research(count, 60, packs),
    bonus: { miningProductivity: 0.1 },
  });

/**
 * Factorio 2.0 values (base game data), limited to what Factidle has content for. Techs that only
 * unlock skipped content (logistics, poles, flammables, the empty "Modules" tech, radar) are left
 * out and their prerequisites folded into the techs that needed them. Catalog order is display order.
 */
const TECHNOLOGIES: Record<TechId, TechDef> = {
  "steam-power": tech({
    id: "steam-power",
    name: "Steam power",
    prerequisites: [],
    unlocks: ["pipe", "offshore-pump", "boiler", "steam-engine", "pump-water", "boil-steam", "generate-electricity"],
    cost: { kind: "trigger", item: "iron-plate", amount: 50 },
  }),
  electronics: tech({
    id: "electronics",
    name: "Electronics",
    prerequisites: [],
    unlocks: ["copper-cable", "electronic-circuit", "inserter", "lab", "research"],
    cost: { kind: "trigger", item: "copper-plate", amount: 10 },
  }),
  "automation-science-pack": tech({
    id: "automation-science-pack",
    name: "Automation science pack",
    prerequisites: ["steam-power", "electronics"],
    unlocks: ["automation-science-pack"],
    cost: { kind: "trigger", item: "lab", amount: 1 },
  }),
  automation: tech({
    id: "automation",
    name: "Automation",
    prerequisites: ["automation-science-pack"],
    unlocks: ["assembling-machine-1"],
    cost: { kind: "research", count: 10, time: 10, packs: ["automation-science-pack"] },
  }),
  "electric-mining-drill": tech({
    id: "electric-mining-drill",
    name: "Electric mining drill",
    prerequisites: ["automation-science-pack"],
    unlocks: ["electric-mining-drill"],
    cost: { kind: "research", count: 25, time: 10, packs: ["automation-science-pack"] },
  }),
  "steel-processing": tech({
    id: "steel-processing",
    name: "Steel processing",
    prerequisites: ["automation-science-pack"],
    unlocks: ["steel-plate", "steel-chest"],
    cost: { kind: "research", count: 50, time: 5, packs: ["automation-science-pack"] },
  }),
  "steel-axe": tech({
    id: "steel-axe",
    name: "Steel axe",
    prerequisites: ["steel-processing"],
    unlocks: [],
    cost: { kind: "trigger", item: "steel-plate", amount: 50 },
    bonus: { manualMining: 1 },
  }),
  "logistic-science-pack": tech({
    id: "logistic-science-pack",
    name: "Logistic science pack",
    prerequisites: ["automation-science-pack"],
    unlocks: ["logistic-science-pack"],
    cost: { kind: "research", count: 75, time: 5, packs: ["automation-science-pack"] },
  }),
  "advanced-material-processing": tech({
    id: "advanced-material-processing",
    name: "Advanced material processing",
    prerequisites: ["steel-processing", "logistic-science-pack"],
    unlocks: ["steel-furnace"],
    cost: { kind: "research", count: 75, time: 30, packs: ["automation-science-pack", "logistic-science-pack"] },
  }),
  "automation-2": tech({
    id: "automation-2",
    name: "Automation 2",
    prerequisites: ["automation", "steel-processing", "logistic-science-pack"],
    unlocks: ["assembling-machine-2"],
    cost: research(40, 15, RG),
  }),
  engine: tech({ id: "engine", name: "Engine", prerequisites: ["steel-processing", "logistic-science-pack"], unlocks: ["engine-unit"], cost: research(100, 15, RG) }),
  "solar-energy": tech({
    id: "solar-energy",
    name: "Solar energy",
    prerequisites: ["steel-processing", "logistic-science-pack"],
    unlocks: ["solar-panel", "solar-power"],
    cost: research(250, 30, RG),
  }),
  "research-speed-1": researchSpeed(1, ["automation-2"], 100, RG, 0.2),
  "research-speed-2": researchSpeed(2, ["research-speed-1"], 200, RG, 0.3),
  "fluid-handling": tech({
    id: "fluid-handling",
    name: "Fluid handling",
    prerequisites: ["automation-2", "engine"],
    unlocks: ["storage-tank"],
    cost: research(50, 15, RG),
  }),
  "oil-gathering": tech({
    id: "oil-gathering",
    name: "Oil gathering",
    prerequisites: ["fluid-handling"],
    unlocks: ["pumpjack", "extract-crude-oil"],
    cost: research(100, 30, RG),
  }),
  // Factorio's trigger is mining crude oil with a pumpjack.
  "oil-processing": tech({
    id: "oil-processing",
    name: "Oil processing",
    prerequisites: ["oil-gathering"],
    unlocks: ["oil-refinery", "chemical-plant", "basic-oil-processing", "solid-fuel-from-petroleum-gas"],
    cost: { kind: "trigger", item: "crude-oil", amount: 1 },
  }),
  plastics: tech({ id: "plastics", name: "Plastics", prerequisites: ["oil-processing"], unlocks: ["plastic-bar"], cost: research(200, 30, RG) }),
  "sulfur-processing": tech({
    id: "sulfur-processing",
    name: "Sulfur processing",
    prerequisites: ["oil-processing"],
    unlocks: ["sulfuric-acid", "sulfur"],
    cost: research(150, 30, RG),
  }),
  "advanced-circuit": tech({
    id: "advanced-circuit",
    name: "Advanced circuit",
    prerequisites: ["plastics"],
    unlocks: ["advanced-circuit"],
    cost: research(200, 15, RG),
  }),
  battery: tech({ id: "battery", name: "Battery", prerequisites: ["sulfur-processing"], unlocks: ["battery"], cost: research(150, 30, RG) }),
  "electric-energy-accumulators": tech({
    id: "electric-energy-accumulators",
    name: "Electric energy accumulators",
    prerequisites: ["battery"],
    unlocks: ["accumulator"],
    cost: research(150, 30, RG),
  }),
  concrete: tech({
    id: "concrete",
    name: "Concrete",
    prerequisites: ["advanced-material-processing", "automation-2"],
    unlocks: ["concrete", "iron-stick"],
    cost: research(250, 30, RG),
  }),
  railway: tech({ id: "railway", name: "Railway", prerequisites: ["engine"], unlocks: ["rail", "iron-stick"], cost: research(75, 30, RG) }),
  ...moduleTechs("speed", "Speed module"),
  ...moduleTechs("productivity", "Productivity module"),
  ...moduleTechs("efficiency", "Efficiency module"),
  "mining-productivity-1": miningProductivity(1, ["advanced-circuit"], 250, RG),
  "chemical-science-pack": tech({
    id: "chemical-science-pack",
    name: "Chemical science pack",
    prerequisites: ["advanced-circuit", "sulfur-processing"],
    unlocks: ["chemical-science-pack"],
    cost: research(75, 10, RG),
  }),
  "advanced-oil-processing": tech({
    id: "advanced-oil-processing",
    name: "Advanced oil processing",
    prerequisites: ["chemical-science-pack"],
    unlocks: ["advanced-oil-processing", "heavy-oil-cracking", "light-oil-cracking", "solid-fuel-from-heavy-oil", "solid-fuel-from-light-oil"],
    cost: research(75, 30, RGB),
  }),
  lubricant: tech({ id: "lubricant", name: "Lubricant", prerequisites: ["advanced-oil-processing"], unlocks: ["lubricant"], cost: research(50, 30, RGB) }),
  "electric-engine": tech({
    id: "electric-engine",
    name: "Electric engine",
    prerequisites: ["lubricant"],
    unlocks: ["electric-engine-unit"],
    cost: research(50, 30, RGB),
  }),
  "processing-unit": tech({
    id: "processing-unit",
    name: "Processing unit",
    prerequisites: ["chemical-science-pack"],
    unlocks: ["processing-unit"],
    cost: research(300, 30, RGB),
  }),
  "low-density-structure": tech({
    id: "low-density-structure",
    name: "Low density structure",
    prerequisites: ["advanced-material-processing", "chemical-science-pack"],
    unlocks: ["low-density-structure"],
    cost: research(300, 45, RGB),
  }),
  robotics: tech({ id: "robotics", name: "Robotics", prerequisites: ["electric-engine", "battery"], unlocks: ["flying-robot-frame"], cost: research(75, 30, RGB) }),
  "rocket-fuel": tech({
    id: "rocket-fuel",
    name: "Rocket fuel",
    prerequisites: ["advanced-oil-processing"],
    unlocks: ["rocket-fuel"],
    cost: research(300, 45, RGB),
  }),
  "advanced-material-processing-2": tech({
    id: "advanced-material-processing-2",
    name: "Advanced material processing 2",
    prerequisites: ["advanced-material-processing", "chemical-science-pack"],
    unlocks: ["electric-furnace"],
    cost: research(250, 30, RGB),
  }),
  "research-speed-3": researchSpeed(3, ["research-speed-2", "chemical-science-pack"], 250, RGB, 0.4),
  "research-speed-4": researchSpeed(4, ["research-speed-3"], 500, RGB, 0.5),
  "mining-productivity-2": miningProductivity(2, ["mining-productivity-1", "chemical-science-pack"], 500, RGB),
  "production-science-pack": tech({
    id: "production-science-pack",
    name: "Production science pack",
    prerequisites: ["productivity-module", "advanced-material-processing-2", "railway"],
    unlocks: ["production-science-pack"],
    cost: research(100, 30, RGB),
  }),
  "utility-science-pack": tech({
    id: "utility-science-pack",
    name: "Utility science pack",
    prerequisites: ["robotics", "processing-unit", "low-density-structure"],
    unlocks: ["utility-science-pack"],
    cost: research(100, 30, RGB),
  }),
  "automation-3": tech({
    id: "automation-3",
    name: "Automation 3",
    prerequisites: ["speed-module", "production-science-pack", "electric-engine"],
    unlocks: ["assembling-machine-3"],
    cost: research(150, 60, RGBP),
  }),
  "research-speed-5": researchSpeed(5, ["research-speed-4", "production-science-pack"], 500, RGBP, 0.5),
  "research-speed-6": researchSpeed(6, ["research-speed-5", "utility-science-pack"], 500, RGBPU, 0.6),
  "mining-productivity-3": miningProductivity(3, ["mining-productivity-2", "production-science-pack", "utility-science-pack"], 1000, RGBPU),
  "rocket-silo": tech({
    id: "rocket-silo",
    name: "Rocket silo",
    prerequisites: [
      "concrete",
      "rocket-fuel",
      "electric-energy-accumulators",
      "solar-energy",
      "utility-science-pack",
      "speed-module-3",
      "productivity-module-3",
    ],
    unlocks: ["rocket-silo", "rocket-part"],
    cost: research(1000, 60, RGBPU),
  }),
  // Military. "Military" (submachine gun, shotgun) and "Laser" (unlocks nothing) are folded away.
  "gun-turret": tech({
    id: "gun-turret",
    name: "Gun turret",
    prerequisites: ["automation-science-pack"],
    unlocks: ["gun-turret", "shoot-firearm-magazine"],
    cost: research(10, 10, RED),
  }),
  "stone-wall": tech({ id: "stone-wall", name: "Stone wall", prerequisites: ["automation-science-pack"], unlocks: ["stone-wall"], cost: research(10, 10, RED) }),
  "repair-pack": tech({
    id: "repair-pack",
    name: "Repair pack",
    prerequisites: ["automation-science-pack"],
    unlocks: ["repair-pack"],
    cost: research(25, 10, RED),
  }),
  "military-2": tech({
    id: "military-2",
    name: "Military 2",
    iconName: "Military",
    prerequisites: ["gun-turret", "steel-processing", "logistic-science-pack"],
    unlocks: ["piercing-rounds-magazine", "shoot-piercing-rounds-magazine", "grenade"],
    cost: research(20, 15, RG),
  }),
  "military-science-pack": tech({
    id: "military-science-pack",
    name: "Military science pack",
    prerequisites: ["military-2", "stone-wall"],
    unlocks: ["military-science-pack"],
    cost: research(30, 15, RG),
  }),
  "laser-turret": tech({
    id: "laser-turret",
    name: "Laser turret",
    prerequisites: ["battery", "chemical-science-pack", "military-science-pack"],
    unlocks: ["laser-turret", "shoot-laser"],
    cost: research(150, 30, RGMB),
  }),
  "physical-projectile-damage-1": physicalDamage(1, [], RED, 0.1),
  "physical-projectile-damage-2": physicalDamage(2, ["logistic-science-pack"], RG, 0.1),
  "physical-projectile-damage-3": physicalDamage(3, ["military-science-pack"], RGM, 0.2),
  "physical-projectile-damage-4": physicalDamage(4, [], RGM, 0.2),
  "physical-projectile-damage-5": physicalDamage(5, ["chemical-science-pack"], RGMB, 0.2),
  "physical-projectile-damage-6": physicalDamage(6, ["utility-science-pack"], RGMBU, 0.4),
  "weapon-shooting-speed-1": shootingSpeed(1, [], RED, 0.1),
  "weapon-shooting-speed-2": shootingSpeed(2, ["logistic-science-pack"], RG, 0.2),
  "weapon-shooting-speed-3": shootingSpeed(3, ["military-science-pack"], RGM, 0.2),
  "weapon-shooting-speed-4": shootingSpeed(4, [], RGM, 0.3),
  "weapon-shooting-speed-5": shootingSpeed(5, ["chemical-science-pack"], RGMB, 0.3),
  "weapon-shooting-speed-6": shootingSpeed(6, ["utility-science-pack"], RGMBU, 0.4),
  "laser-weapons-damage-1": laserDamage(1, [], RGMB, 0.2),
  "laser-weapons-damage-2": laserDamage(2, [], RGMB, 0.2),
  "laser-weapons-damage-3": laserDamage(3, [], RGMB, 0.3),
  "laser-weapons-damage-4": laserDamage(4, [], RGMB, 0.4),
  "laser-weapons-damage-5": laserDamage(5, ["utility-science-pack"], RGMBU, 0.5),
  "laser-weapons-damage-6": laserDamage(6, [], RGMBU, 0.7),
  "laser-shooting-speed-1": laserSpeed(1, [], 50, RGMB, 0.1),
  "laser-shooting-speed-2": laserSpeed(2, [], 100, RGMB, 0.2),
  "laser-shooting-speed-3": laserSpeed(3, [], 200, RGMB, 0.3),
  "laser-shooting-speed-4": laserSpeed(4, [], 200, RGMB, 0.3),
  "laser-shooting-speed-5": laserSpeed(5, ["utility-science-pack"], 200, RGMBU, 0.4),
  "laser-shooting-speed-6": laserSpeed(6, [], 350, RGMBU, 0.4),
  "laser-shooting-speed-7": laserSpeed(7, [], 450, RGMBU, 0.5),
};

const TECH_IDS = Object.keys(TECHNOLOGIES) as TechId[];

export { TECH_IDS, TECHNOLOGIES };
export type { ResearchCost, SciencePackId, TechBonus, TechDef, TechId, TriggerCost };
