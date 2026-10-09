// All game content lives here. Values follow Factorio 2.0 (checked against wiki.factorio.com) unless noted.

type OreId = "iron-ore" | "copper-ore" | "coal" | "stone";

type MachineId =
  | "burner-mining-drill"
  | "electric-mining-drill"
  | "pumpjack"
  | "stone-furnace"
  | "steel-furnace"
  | "electric-furnace"
  | "offshore-pump"
  | "boiler"
  | "steam-engine"
  | "solar-panel"
  | "accumulator"
  | "oil-refinery"
  | "chemical-plant"
  | "assembling-machine-1"
  | "assembling-machine-2"
  | "assembling-machine-3"
  | "lab"
  | "rocket-silo"
  | "iron-chest"
  | "steel-chest"
  | "storage-tank"
  | "gun-turret"
  | "laser-turret"
  | "stone-wall";

type ModuleId =
  | "speed-module"
  | "speed-module-2"
  | "speed-module-3"
  | "efficiency-module"
  | "efficiency-module-2"
  | "efficiency-module-3"
  | "productivity-module"
  | "productivity-module-2"
  | "productivity-module-3";

/** Fluids that can be stored (in storage tanks), unlike flows. */
type FluidId = "crude-oil" | "heavy-oil" | "light-oil" | "petroleum-gas" | "lubricant" | "sulfuric-acid";

/** Intermediate products that have a crafting recipe of the same id. */
type ProductId =
  | "iron-gear-wheel"
  | "copper-cable"
  | "electronic-circuit"
  | "pipe"
  | "transport-belt"
  | "inserter"
  | "engine-unit"
  | "electric-engine-unit"
  | "advanced-circuit"
  | "processing-unit"
  | "low-density-structure"
  | "flying-robot-frame"
  | "rocket-fuel"
  | "concrete"
  | "rail"
  | "iron-stick"
  | "automation-science-pack"
  | "logistic-science-pack"
  | "chemical-science-pack"
  | "production-science-pack"
  | "utility-science-pack"
  | "military-science-pack"
  | "firearm-magazine"
  | "piercing-rounds-magazine"
  | "grenade"
  | "repair-pack"
  | ModuleId;

type ItemId =
  | OreId
  | FluidId
  | ProductId
  | "iron-plate"
  | "copper-plate"
  | "steel-plate"
  | "stone-brick"
  | "plastic-bar"
  | "sulfur"
  | "battery"
  | "solid-fuel"
  | "rocket-part"
  | MachineId;

/**
 * Flows are never stored: they are produced and consumed within a tick. Firepower is turret
 * damage per second; pollution is only tracked (engine/combat.ts), never consumed by machines.
 */
type FlowId = "water" | "steam" | "electricity" | "firepower" | "pollution";

type ResourceId = ItemId | FlowId;

type RecipeId =
  | "mine-iron-ore"
  | "mine-copper-ore"
  | "mine-coal"
  | "mine-stone"
  | "extract-crude-oil"
  | "iron-plate"
  | "copper-plate"
  | "steel-plate"
  | "stone-brick"
  | ProductId
  | "basic-oil-processing"
  | "advanced-oil-processing"
  | "heavy-oil-cracking"
  | "light-oil-cracking"
  | "plastic-bar"
  | "sulfur"
  | "sulfuric-acid"
  | "battery"
  | "lubricant"
  | "solid-fuel-from-petroleum-gas"
  | "solid-fuel-from-light-oil"
  | "solid-fuel-from-heavy-oil"
  | "rocket-part"
  | "shoot-firearm-magazine"
  | "shoot-piercing-rounds-magazine"
  | "shoot-laser"
  | "biter-attack"
  | "pump-water"
  | "boil-steam"
  | "generate-electricity"
  | "solar-power"
  | "research"
  | MachineId;

/**
 * `crafting` and `building` recipes can be hand-crafted and assembled. `advanced-crafting` and
 * `crafting-with-fluid` need an assembler (the latter assembler 2+), as in Factorio.
 */
type RecipeCategory =
  | "mining"
  | "oil-extraction"
  | "smelting"
  | "crafting"
  | "advanced-crafting"
  | "crafting-with-fluid"
  | "building"
  | "oil-processing"
  | "chemistry"
  | "pumping"
  | "boiling"
  | "generating"
  | "solar"
  | "research"
  | "rocket-building"
  | "turret-bullet"
  | "turret-laser"
  | "combat";

type TabId = "mining" | "smelting" | "energy" | "oil" | "products" | "research" | "military" | "rocket" | "logistics" | "stats";

type ResourceKind = "resource" | "product" | "fluid" | "building" | "flow";

type Amounts = Partial<Record<ResourceId, number>>;

interface ResourceDef {
  id: ResourceId;
  name: string;
  icon: string;
  kind: ResourceKind;
  /** Factorio stack size; drives storage caps. 0 for flows. */
  stackSize: number;
  /** Display unit for rates, e.g. "kW". Plain counts when omitted. */
  unit?: string;
  /** Fixed storage cap that chests don't raise (rocket parts). */
  capacity?: number;
}

interface RecipeDef {
  id: RecipeId;
  name: string;
  category: RecipeCategory;
  /** Seconds per craft at speed 1. */
  time: number;
  ingredients: Amounts;
  results: Amounts;
}

interface EnergyDef {
  kind: "burner" | "electric";
  kw: number;
}

interface MachineDef {
  id: MachineId;
  name: string;
  tab: TabId;
  description: string;
  categories: RecipeCategory[];
  speed: number;
  energy: EnergyDef | null;
  /** Machines with a single fixed recipe have no allocation controls. */
  fixedRecipe?: RecipeId;
  /** Storage slots added per building (chests). */
  storageSlots?: number;
  /** Recipes are assigned whole machines (counts) instead of percentage shares. */
  wholeMachines?: boolean;
  /** Fluid storage added per building (storage tanks). */
  fluidStorage?: number;
  moduleSlots?: number;
  /** Priority on the power grid that the player can't change: solar first, accumulators last. */
  fixedPriority?: number;
  /** Factorio pollution per minute at full speed; scales with energy use. */
  pollution?: number;
  /** Hit points of one building; biters destroy buildings by dealing this much damage. */
  health: number;
}

/** Bonuses as fractions, e.g. speed 0.2 = +20%. */
interface ModuleEffect {
  speed: number;
  productivity: number;
  consumption: number;
  pollution: number;
}

const iconUrl = (name: string) => `https://wiki.factorio.com/images/${name}.png`;

const defineResource = (
  id: ResourceId,
  name: string,
  kind: ResourceKind,
  stackSize: number,
  unit?: string,
  icon = iconUrl(name.replaceAll(" ", "_")),
): ResourceDef => ({ id, name, icon, kind, stackSize, unit });
const fluid = (id: FluidId, name: string) => defineResource(id, name, "fluid", 0, "u");

const RESOURCES: Record<ResourceId, ResourceDef> = {
  "iron-ore": defineResource("iron-ore", "Iron ore", "resource", 50),
  "copper-ore": defineResource("copper-ore", "Copper ore", "resource", 50),
  coal: defineResource("coal", "Coal", "resource", 50),
  stone: defineResource("stone", "Stone", "resource", 50),
  "iron-plate": defineResource("iron-plate", "Iron plate", "product", 100),
  "copper-plate": defineResource("copper-plate", "Copper plate", "product", 100),
  "steel-plate": defineResource("steel-plate", "Steel plate", "product", 100),
  "stone-brick": defineResource("stone-brick", "Stone brick", "product", 100),
  "crude-oil": fluid("crude-oil", "Crude oil"),
  "heavy-oil": fluid("heavy-oil", "Heavy oil"),
  "light-oil": fluid("light-oil", "Light oil"),
  "petroleum-gas": fluid("petroleum-gas", "Petroleum gas"),
  lubricant: fluid("lubricant", "Lubricant"),
  "sulfuric-acid": fluid("sulfuric-acid", "Sulfuric acid"),
  "plastic-bar": defineResource("plastic-bar", "Plastic bar", "product", 100),
  sulfur: defineResource("sulfur", "Sulfur", "product", 50),
  battery: defineResource("battery", "Battery", "product", 200),
  "solid-fuel": defineResource("solid-fuel", "Solid fuel", "product", 50),
  "iron-gear-wheel": defineResource("iron-gear-wheel", "Iron gear wheel", "product", 100),
  "copper-cable": defineResource("copper-cable", "Copper cable", "product", 200),
  "electronic-circuit": defineResource("electronic-circuit", "Electronic circuit", "product", 200),
  pipe: defineResource("pipe", "Pipe", "product", 100),
  "transport-belt": defineResource("transport-belt", "Transport belt", "product", 100),
  inserter: defineResource("inserter", "Inserter", "product", 50),
  "automation-science-pack": defineResource("automation-science-pack", "Automation science pack", "product", 200),
  "logistic-science-pack": defineResource("logistic-science-pack", "Logistic science pack", "product", 200),
  "engine-unit": defineResource("engine-unit", "Engine unit", "product", 50),
  "electric-engine-unit": defineResource("electric-engine-unit", "Electric engine unit", "product", 50),
  "advanced-circuit": defineResource("advanced-circuit", "Advanced circuit", "product", 200),
  "processing-unit": defineResource("processing-unit", "Processing unit", "product", 100),
  "low-density-structure": defineResource("low-density-structure", "Low density structure", "product", 50),
  "flying-robot-frame": defineResource("flying-robot-frame", "Flying robot frame", "product", 50),
  "rocket-fuel": defineResource("rocket-fuel", "Rocket fuel", "product", 20),
  concrete: defineResource("concrete", "Concrete", "product", 100),
  rail: defineResource("rail", "Rail", "product", 100, undefined, iconUrl("Straight_rail")),
  "iron-stick": defineResource("iron-stick", "Iron stick", "product", 100),
  "chemical-science-pack": defineResource("chemical-science-pack", "Chemical science pack", "product", 200),
  "production-science-pack": defineResource("production-science-pack", "Production science pack", "product", 200),
  "utility-science-pack": defineResource("utility-science-pack", "Utility science pack", "product", 200),
  "speed-module": defineResource("speed-module", "Speed module", "product", 50),
  "speed-module-2": defineResource("speed-module-2", "Speed module 2", "product", 50),
  "speed-module-3": defineResource("speed-module-3", "Speed module 3", "product", 50),
  "efficiency-module": defineResource("efficiency-module", "Efficiency module", "product", 50),
  "efficiency-module-2": defineResource("efficiency-module-2", "Efficiency module 2", "product", 50),
  "efficiency-module-3": defineResource("efficiency-module-3", "Efficiency module 3", "product", 50),
  "productivity-module": defineResource("productivity-module", "Productivity module", "product", 50),
  "productivity-module-2": defineResource("productivity-module-2", "Productivity module 2", "product", 50),
  "productivity-module-3": defineResource("productivity-module-3", "Productivity module 3", "product", 50),
  // A rocket launches as soon as the silo holds all its parts, so parts never need more room.
  "firearm-magazine": defineResource("firearm-magazine", "Firearm magazine", "product", 100),
  "piercing-rounds-magazine": defineResource("piercing-rounds-magazine", "Piercing rounds magazine", "product", 100),
  grenade: defineResource("grenade", "Grenade", "product", 100),
  "repair-pack": defineResource("repair-pack", "Repair pack", "product", 100),
  "military-science-pack": defineResource("military-science-pack", "Military science pack", "product", 200),
  "rocket-part": { ...defineResource("rocket-part", "Rocket part", "product", 5), capacity: 100 },
  "burner-mining-drill": defineResource("burner-mining-drill", "Burner mining drill", "building", 50),
  "electric-mining-drill": defineResource("electric-mining-drill", "Electric mining drill", "building", 50),
  "stone-furnace": defineResource("stone-furnace", "Stone furnace", "building", 50),
  "steel-furnace": defineResource("steel-furnace", "Steel furnace", "building", 50),
  "offshore-pump": defineResource("offshore-pump", "Offshore pump", "building", 20),
  boiler: defineResource("boiler", "Boiler", "building", 50),
  "steam-engine": defineResource("steam-engine", "Steam engine", "building", 10),
  "assembling-machine-1": defineResource("assembling-machine-1", "Assembling machine 1", "building", 50),
  lab: defineResource("lab", "Lab", "building", 10),
  "iron-chest": defineResource("iron-chest", "Iron chest", "building", 50),
  pumpjack: defineResource("pumpjack", "Pumpjack", "building", 20),
  "electric-furnace": defineResource("electric-furnace", "Electric furnace", "building", 50),
  "solar-panel": defineResource("solar-panel", "Solar panel", "building", 50),
  accumulator: defineResource("accumulator", "Accumulator", "building", 50),
  "oil-refinery": defineResource("oil-refinery", "Oil refinery", "building", 10),
  "chemical-plant": defineResource("chemical-plant", "Chemical plant", "building", 10),
  "assembling-machine-2": defineResource("assembling-machine-2", "Assembling machine 2", "building", 50),
  "assembling-machine-3": defineResource("assembling-machine-3", "Assembling machine 3", "building", 50),
  "rocket-silo": defineResource("rocket-silo", "Rocket silo", "building", 1),
  "steel-chest": defineResource("steel-chest", "Steel chest", "building", 50),
  "storage-tank": defineResource("storage-tank", "Storage tank", "building", 50),
  "gun-turret": defineResource("gun-turret", "Gun turret", "building", 50),
  "laser-turret": defineResource("laser-turret", "Laser turret", "building", 50),
  "stone-wall": defineResource("stone-wall", "Stone wall", "building", 100, undefined, iconUrl("Wall")),
  water: defineResource("water", "Water", "flow", 0, "u"),
  steam: defineResource("steam", "Steam", "flow", 0, "u"),
  // Electricity amounts are kJ, so rates are kW.
  electricity: defineResource("electricity", "Electricity", "flow", 0, "W", ""),
  // Raw biter health turrets can remove per second.
  firepower: defineResource("firepower", "Firepower", "flow", 0, "HP", iconUrl("Gun_turret")),
  pollution: defineResource("pollution", "Pollution", "flow", 0),
};

const recipe = (
  id: RecipeId,
  name: string,
  category: RecipeCategory,
  time: number,
  ingredients: Amounts,
  results: Amounts,
): RecipeDef => ({ id, name, category, time, ingredients, results });

const mine = (id: RecipeId, ore: OreId) => recipe(id, RESOURCES[ore].name, "mining", 1, {}, { [ore]: 1 });
const smelt = (id: RecipeId & ItemId, ingredients: Amounts, time = 3.2) =>
  recipe(id, RESOURCES[id].name, "smelting", time, ingredients, { [id]: 1 });
const craft = (id: RecipeId & ItemId, ingredients: Amounts, time = 0.5, yields = 1, category: RecipeCategory = "crafting") =>
  recipe(id, RESOURCES[id].name, category, time, ingredients, { [id]: yields });
const chemistry = (id: RecipeId, name: string, time: number, ingredients: Amounts, results: Amounts) =>
  recipe(id, name, "chemistry", time, ingredients, results);
const MODULE_INGREDIENTS = { "advanced-circuit": 5, "processing-unit": 5 };
const build = (id: MachineId, ingredients: Amounts, time = 0.5) =>
  recipe(id, RESOURCES[id].name, "building", time, ingredients, { [id]: 1 });

const RECIPES: Record<RecipeId, RecipeDef> = {
  "mine-iron-ore": mine("mine-iron-ore", "iron-ore"),
  "mine-copper-ore": mine("mine-copper-ore", "copper-ore"),
  "mine-coal": mine("mine-coal", "coal"),
  "mine-stone": mine("mine-stone", "stone"),
  // A pumpjack on a 100% yield field.
  "extract-crude-oil": recipe("extract-crude-oil", "Crude oil", "oil-extraction", 1, {}, { "crude-oil": 10 }),
  "iron-plate": smelt("iron-plate", { "iron-ore": 1 }),
  "copper-plate": smelt("copper-plate", { "copper-ore": 1 }),
  "stone-brick": smelt("stone-brick", { stone: 2 }),
  "steel-plate": smelt("steel-plate", { "iron-plate": 5 }, 16),
  "iron-gear-wheel": craft("iron-gear-wheel", { "iron-plate": 2 }),
  "copper-cable": craft("copper-cable", { "copper-plate": 1 }, 0.5, 2),
  "electronic-circuit": craft("electronic-circuit", { "iron-plate": 1, "copper-cable": 3 }),
  pipe: craft("pipe", { "iron-plate": 1 }),
  "transport-belt": craft("transport-belt", { "iron-gear-wheel": 1, "iron-plate": 1 }, 0.5, 2),
  inserter: craft("inserter", { "electronic-circuit": 1, "iron-gear-wheel": 1, "iron-plate": 1 }),
  "automation-science-pack": craft("automation-science-pack", { "copper-plate": 1, "iron-gear-wheel": 1 }, 5),
  "logistic-science-pack": craft("logistic-science-pack", { inserter: 1, "transport-belt": 1 }, 6),
  "engine-unit": craft("engine-unit", { "steel-plate": 1, "iron-gear-wheel": 1, pipe: 2 }, 10, 1, "advanced-crafting"),
  "electric-engine-unit": craft("electric-engine-unit", { "engine-unit": 1, lubricant: 15, "electronic-circuit": 2 }, 10, 1, "crafting-with-fluid"),
  "advanced-circuit": craft("advanced-circuit", { "electronic-circuit": 2, "plastic-bar": 2, "copper-cable": 4 }, 6),
  "processing-unit": craft("processing-unit", { "electronic-circuit": 20, "advanced-circuit": 2, "sulfuric-acid": 5 }, 10, 1, "crafting-with-fluid"),
  "low-density-structure": craft("low-density-structure", { "steel-plate": 2, "copper-plate": 20, "plastic-bar": 5 }, 15),
  "flying-robot-frame": craft("flying-robot-frame", { "electric-engine-unit": 1, battery: 2, "steel-plate": 1, "electronic-circuit": 3 }, 20),
  "rocket-fuel": craft("rocket-fuel", { "solid-fuel": 10, "light-oil": 10 }, 15, 1, "crafting-with-fluid"),
  concrete: craft("concrete", { "stone-brick": 5, "iron-ore": 1, water: 100 }, 10, 10, "crafting-with-fluid"),
  "iron-stick": craft("iron-stick", { "iron-plate": 1 }, 0.5, 2),
  rail: craft("rail", { stone: 1, "iron-stick": 1, "steel-plate": 1 }, 0.5, 2),
  "chemical-science-pack": craft("chemical-science-pack", { "engine-unit": 2, "advanced-circuit": 3, sulfur: 1 }, 24, 2),
  "production-science-pack": craft("production-science-pack", { "electric-furnace": 1, "productivity-module": 1, rail: 30 }, 21, 3),
  "utility-science-pack": craft("utility-science-pack", { "low-density-structure": 3, "processing-unit": 2, "flying-robot-frame": 1 }, 21, 3),
  "speed-module": craft("speed-module", { "advanced-circuit": 5, "electronic-circuit": 5 }, 15),
  "speed-module-2": craft("speed-module-2", { "speed-module": 4, ...MODULE_INGREDIENTS }, 30),
  "speed-module-3": craft("speed-module-3", { "speed-module-2": 4, ...MODULE_INGREDIENTS }, 60),
  "efficiency-module": craft("efficiency-module", { "advanced-circuit": 5, "electronic-circuit": 5 }, 15),
  "efficiency-module-2": craft("efficiency-module-2", { "efficiency-module": 4, ...MODULE_INGREDIENTS }, 30),
  "efficiency-module-3": craft("efficiency-module-3", { "efficiency-module-2": 4, ...MODULE_INGREDIENTS }, 60),
  "productivity-module": craft("productivity-module", { "advanced-circuit": 5, "electronic-circuit": 5 }, 15),
  "productivity-module-2": craft("productivity-module-2", { "productivity-module": 4, ...MODULE_INGREDIENTS }, 30),
  "productivity-module-3": craft("productivity-module-3", { "productivity-module-2": 4, ...MODULE_INGREDIENTS }, 60),
  // Multi-output recipes list their main product first; it names the recipe's row and icon.
  "basic-oil-processing": recipe("basic-oil-processing", "Basic oil processing", "oil-processing", 5, { "crude-oil": 100 }, { "petroleum-gas": 45 }),
  "advanced-oil-processing": recipe(
    "advanced-oil-processing",
    "Advanced oil processing",
    "oil-processing",
    5,
    { water: 50, "crude-oil": 100 },
    { "petroleum-gas": 55, "light-oil": 45, "heavy-oil": 25 },
  ),
  "heavy-oil-cracking": chemistry("heavy-oil-cracking", "Heavy oil cracking", 2, { water: 30, "heavy-oil": 40 }, { "light-oil": 30 }),
  "light-oil-cracking": chemistry("light-oil-cracking", "Light oil cracking", 2, { water: 30, "light-oil": 30 }, { "petroleum-gas": 20 }),
  "plastic-bar": chemistry("plastic-bar", "Plastic bar", 1, { "petroleum-gas": 20, coal: 1 }, { "plastic-bar": 2 }),
  sulfur: chemistry("sulfur", "Sulfur", 1, { water: 30, "petroleum-gas": 30 }, { sulfur: 2 }),
  "sulfuric-acid": chemistry("sulfuric-acid", "Sulfuric acid", 1, { sulfur: 5, "iron-plate": 1, water: 100 }, { "sulfuric-acid": 50 }),
  battery: chemistry("battery", "Battery", 4, { "sulfuric-acid": 20, "iron-plate": 1, "copper-plate": 1 }, { battery: 1 }),
  lubricant: chemistry("lubricant", "Lubricant", 1, { "heavy-oil": 10 }, { lubricant: 10 }),
  "solid-fuel-from-petroleum-gas": chemistry("solid-fuel-from-petroleum-gas", "Solid fuel from petroleum gas", 1, { "petroleum-gas": 20 }, { "solid-fuel": 1 }),
  "solid-fuel-from-light-oil": chemistry("solid-fuel-from-light-oil", "Solid fuel from light oil", 1, { "light-oil": 10 }, { "solid-fuel": 1 }),
  "solid-fuel-from-heavy-oil": chemistry("solid-fuel-from-heavy-oil", "Solid fuel from heavy oil", 1, { "heavy-oil": 20 }, { "solid-fuel": 1 }),
  "firearm-magazine": craft("firearm-magazine", { "iron-plate": 4 }, 1),
  "piercing-rounds-magazine": craft("piercing-rounds-magazine", { "firearm-magazine": 2, "steel-plate": 1, "copper-plate": 2 }, 6, 2),
  grenade: craft("grenade", { "iron-plate": 5, coal: 10 }, 8),
  "repair-pack": craft("repair-pack", { "electronic-circuit": 2, "iron-gear-wheel": 2 }),
  "military-science-pack": craft("military-science-pack", { "piercing-rounds-magazine": 1, grenade: 1, "stone-wall": 2 }, 10, 2),
  // One shot each. Damage per shot depends on the biters and research (engine/combat.ts).
  "shoot-firearm-magazine": recipe("shoot-firearm-magazine", "Firearm magazine", "turret-bullet", 0.1, { "firearm-magazine": 0.1 }, { firepower: 1 }),
  "shoot-piercing-rounds-magazine": recipe(
    "shoot-piercing-rounds-magazine",
    "Piercing rounds magazine",
    "turret-bullet",
    0.1,
    { "piercing-rounds-magazine": 0.1 },
    { firepower: 1 },
  ),
  "shoot-laser": recipe("shoot-laser", "Laser", "turret-laser", 40 / 60, {}, { firepower: 1 }),
  // Internal: the incoming biters, consuming firepower (engine/combat.ts). No machine runs it.
  "biter-attack": recipe("biter-attack", "Biter attack", "combat", 1, {}, {}),
  "rocket-part": recipe("rocket-part", "Rocket part", "rocket-building", 3, { "processing-unit": 10, "low-density-structure": 10, "rocket-fuel": 10 }, { "rocket-part": 1 }),
  "pump-water": recipe("pump-water", "Water", "pumping", 1, {}, { water: 1200 }),
  "boil-steam": recipe("boil-steam", "Steam", "boiling", 1, { water: 60 }, { steam: 60 }),
  "generate-electricity": recipe("generate-electricity", "Electricity", "generating", 1, { steam: 30 }, { electricity: 900 }),
  // Peak output; scaled by daylight (engine/daylight.ts).
  "solar-power": recipe("solar-power", "Solar power", "solar", 1, {}, { electricity: 60 }),
  // Placeholder: a lab's science-pack inputs come from the current technology (engine/research.ts).
  research: recipe("research", "Research", "research", 1, {}, {}),
  "burner-mining-drill": build("burner-mining-drill", { "iron-gear-wheel": 3, "iron-plate": 3, "stone-furnace": 1 }, 2),
  "electric-mining-drill": build("electric-mining-drill", { "electronic-circuit": 3, "iron-gear-wheel": 5, "iron-plate": 10 }, 2),
  "stone-furnace": build("stone-furnace", { stone: 5 }),
  "steel-furnace": build("steel-furnace", { "steel-plate": 6, "stone-brick": 10 }, 3),
  "offshore-pump": build("offshore-pump", { "iron-gear-wheel": 2, pipe: 3 }),
  boiler: build("boiler", { "stone-furnace": 1, pipe: 4 }),
  "steam-engine": build("steam-engine", { "iron-gear-wheel": 8, pipe: 5, "iron-plate": 10 }),
  "assembling-machine-1": build("assembling-machine-1", { "electronic-circuit": 3, "iron-gear-wheel": 5, "iron-plate": 9 }),
  lab: build("lab", { "electronic-circuit": 10, "iron-gear-wheel": 10, "transport-belt": 4 }, 2),
  "iron-chest": build("iron-chest", { "iron-plate": 8 }),
  "steel-chest": build("steel-chest", { "steel-plate": 8 }),
  "storage-tank": build("storage-tank", { "iron-plate": 20, "steel-plate": 5 }, 3),
  "assembling-machine-2": build("assembling-machine-2", { "steel-plate": 2, "electronic-circuit": 3, "iron-gear-wheel": 5, "assembling-machine-1": 1 }),
  "assembling-machine-3": build("assembling-machine-3", { "speed-module": 4, "assembling-machine-2": 2 }),
  "electric-furnace": build("electric-furnace", { "steel-plate": 10, "advanced-circuit": 5, "stone-brick": 10 }, 5),
  "solar-panel": build("solar-panel", { "steel-plate": 5, "electronic-circuit": 15, "copper-plate": 5 }, 10),
  accumulator: build("accumulator", { "iron-plate": 2, battery: 5 }, 10),
  pumpjack: build("pumpjack", { "steel-plate": 5, "iron-gear-wheel": 10, "electronic-circuit": 5, pipe: 10 }, 5),
  "oil-refinery": build("oil-refinery", { "steel-plate": 15, "iron-gear-wheel": 10, "stone-brick": 10, "electronic-circuit": 10, pipe: 10 }, 8),
  "chemical-plant": build("chemical-plant", { "steel-plate": 5, "iron-gear-wheel": 5, "electronic-circuit": 5, pipe: 5 }, 5),
  "gun-turret": build("gun-turret", { "iron-gear-wheel": 10, "copper-plate": 10, "iron-plate": 20 }, 8),
  "laser-turret": build("laser-turret", { "steel-plate": 20, "electronic-circuit": 20, battery: 12 }, 20),
  "stone-wall": build("stone-wall", { "stone-brick": 5 }),
  "rocket-silo": build("rocket-silo", { "steel-plate": 1000, concrete: 1000, pipe: 100, "processing-unit": 200, "electric-engine-unit": 200 }, 30),
};

const machine = (def: Omit<MachineDef, "name">): MachineDef => ({ ...def, name: RESOURCES[def.id].name });

/** Catalog order is the deterministic processing order of the simulation. */
const ASSEMBLER_CATEGORIES: RecipeCategory[] = ["crafting", "advanced-crafting", "building"];

const MACHINES: Record<MachineId, MachineDef> = {
  "offshore-pump": machine({
    id: "offshore-pump",
    health: 150,
    tab: "energy",
    description: "Pumps water. Needs no power.",
    categories: ["pumping"],
    speed: 1,
    energy: null,
    fixedRecipe: "pump-water",
  }),
  boiler: machine({
    id: "boiler",
    health: 200,
    pollution: 30,
    tab: "energy",
    description: "Burns coal to turn water into steam.",
    categories: ["boiling"],
    speed: 1,
    energy: { kind: "burner", kw: 1800 },
    fixedRecipe: "boil-steam",
  }),
  "steam-engine": machine({
    id: "steam-engine",
    health: 400,
    tab: "energy",
    description: "Turns steam into electricity. Output follows demand.",
    categories: ["generating"],
    speed: 1,
    energy: null,
    fixedRecipe: "generate-electricity",
  }),
  "solar-panel": machine({
    id: "solar-panel",
    health: 200,
    tab: "energy",
    description: "Free power while the sun is up: 60 kW at noon, nothing at night. Used before steam.",
    categories: ["solar"],
    speed: 1,
    energy: null,
    fixedRecipe: "solar-power",
    fixedPriority: 100,
  }),
  accumulator: machine({
    id: "accumulator",
    health: 150,
    tab: "energy",
    description: "Stores 5 MJ. Charges from spare power and covers shortfalls, up to 300 kW each.",
    categories: [],
    speed: 0,
    energy: null,
    fixedPriority: -100,
  }),
  "burner-mining-drill": machine({
    id: "burner-mining-drill",
    health: 150,
    pollution: 12,
    tab: "mining",
    description: "Mines raw resources. Burns coal.",
    categories: ["mining"],
    speed: 0.25,
    energy: { kind: "burner", kw: 150 },
  }),
  "electric-mining-drill": machine({
    id: "electric-mining-drill",
    health: 300,
    pollution: 10,
    tab: "mining",
    description: "Mines raw resources twice as fast. Needs electricity.",
    categories: ["mining"],
    speed: 0.5,
    energy: { kind: "electric", kw: 90 },
    moduleSlots: 3,
  }),
  pumpjack: machine({
    id: "pumpjack",
    health: 200,
    pollution: 10,
    tab: "oil",
    description: "Extracts crude oil. Needs electricity.",
    categories: ["oil-extraction"],
    speed: 1,
    energy: { kind: "electric", kw: 90 },
    fixedRecipe: "extract-crude-oil",
    moduleSlots: 2,
  }),
  "stone-furnace": machine({
    id: "stone-furnace",
    health: 200,
    pollution: 2,
    tab: "smelting",
    description: "Smelts ores into plates and bricks. Burns coal.",
    categories: ["smelting"],
    speed: 1,
    energy: { kind: "burner", kw: 90 },
  }),
  "steel-furnace": machine({
    id: "steel-furnace",
    health: 300,
    pollution: 4,
    tab: "smelting",
    description: "Smelts twice as fast as a stone furnace.",
    categories: ["smelting"],
    speed: 2,
    energy: { kind: "burner", kw: 90 },
  }),
  "electric-furnace": machine({
    id: "electric-furnace",
    health: 350,
    pollution: 1,
    tab: "smelting",
    description: "Smelts as fast as a steel furnace on electricity, with 2 module slots.",
    categories: ["smelting"],
    speed: 2,
    energy: { kind: "electric", kw: 180 },
    moduleSlots: 2,
  }),
  "oil-refinery": machine({
    id: "oil-refinery",
    health: 350,
    pollution: 6,
    tab: "oil",
    description: "Refines crude oil into petroleum gas, light oil and heavy oil.",
    categories: ["oil-processing"],
    speed: 1,
    energy: { kind: "electric", kw: 420 },
    wholeMachines: true,
    moduleSlots: 3,
  }),
  "chemical-plant": machine({
    id: "chemical-plant",
    health: 300,
    pollution: 4,
    tab: "oil",
    description: "Turns fluids into plastic, sulfur, acid, batteries, lubricant and solid fuel, and cracks oil.",
    categories: ["chemistry"],
    speed: 1,
    energy: { kind: "electric", kw: 210 },
    wholeMachines: true,
    moduleSlots: 3,
  }),
  "assembling-machine-1": machine({
    id: "assembling-machine-1",
    health: 300,
    pollution: 4,
    tab: "products",
    description: "Crafts intermediate products and buildings. Needs electricity.",
    categories: ASSEMBLER_CATEGORIES,
    speed: 0.5,
    energy: { kind: "electric", kw: 75 },
    wholeMachines: true,
  }),
  "assembling-machine-2": machine({
    id: "assembling-machine-2",
    health: 350,
    pollution: 3,
    tab: "products",
    description: "Crafts faster than assembler 1 and handles recipes with fluids. 2 module slots.",
    categories: [...ASSEMBLER_CATEGORIES, "crafting-with-fluid"],
    speed: 0.75,
    energy: { kind: "electric", kw: 150 },
    wholeMachines: true,
    moduleSlots: 2,
  }),
  "assembling-machine-3": machine({
    id: "assembling-machine-3",
    health: 400,
    pollution: 2,
    tab: "products",
    description: "The fastest assembler, with 4 module slots.",
    categories: [...ASSEMBLER_CATEGORIES, "crafting-with-fluid"],
    speed: 1.25,
    energy: { kind: "electric", kw: 375 },
    wholeMachines: true,
    moduleSlots: 4,
  }),
  lab: machine({
    id: "lab",
    health: 150,
    tab: "research",
    description: "Consumes science packs to research technologies. Needs electricity.",
    categories: ["research"],
    speed: 1,
    energy: { kind: "electric", kw: 60 },
    fixedRecipe: "research",
    moduleSlots: 2,
  }),
  "rocket-silo": machine({
    id: "rocket-silo",
    health: 5000,
    tab: "rocket",
    description: "Builds rocket parts. The rocket launches once all 100 are done.",
    categories: ["rocket-building"],
    speed: 1,
    energy: { kind: "electric", kw: 250 },
    fixedRecipe: "rocket-part",
    moduleSlots: 4,
  }),
  "iron-chest": machine({
    id: "iron-chest",
    health: 200,
    tab: "logistics",
    description: "Adds 32 slots of storage to every item.",
    categories: [],
    speed: 0,
    energy: null,
    storageSlots: 32,
  }),
  "steel-chest": machine({
    id: "steel-chest",
    health: 350,
    tab: "logistics",
    description: "Adds 48 slots of storage to every item.",
    categories: [],
    speed: 0,
    energy: null,
    storageSlots: 48,
  }),
  "storage-tank": machine({
    id: "storage-tank",
    health: 500,
    tab: "logistics",
    description: "Stores 25,000 units of every fluid.",
    categories: [],
    speed: 0,
    energy: null,
    fluidStorage: 25000,
  }),
  "gun-turret": machine({
    id: "gun-turret",
    tab: "military",
    description: "Shoots biters with magazines: 10 shots per second, each a tenth of a magazine.",
    categories: ["turret-bullet"],
    speed: 1,
    energy: null,
    wholeMachines: true,
    health: 400,
  }),
  "laser-turret": machine({
    id: "laser-turret",
    tab: "military",
    description: "Shoots biters with power: 20 damage per shot, 1.5 shots per second, 800 kJ each.",
    categories: ["turret-laser"],
    speed: 1,
    energy: { kind: "electric", kw: 1200 },
    fixedRecipe: "shoot-laser",
    health: 1000,
  }),
  "stone-wall": machine({
    id: "stone-wall",
    tab: "military",
    description: "350 HP each. Biters that get past the turrets chew through walls before reaching your buildings.",
    categories: [],
    speed: 0,
    energy: null,
    health: 350,
  }),
};

/** Factorio 2.0 module effects (quality effects left out). */
const MODULES: Record<ModuleId, ModuleEffect> = {
  "speed-module": { speed: 0.2, productivity: 0, consumption: 0.5, pollution: 0 },
  "speed-module-2": { speed: 0.3, productivity: 0, consumption: 0.6, pollution: 0 },
  "speed-module-3": { speed: 0.5, productivity: 0, consumption: 0.7, pollution: 0 },
  "efficiency-module": { speed: 0, productivity: 0, consumption: -0.3, pollution: 0 },
  "efficiency-module-2": { speed: 0, productivity: 0, consumption: -0.4, pollution: 0 },
  "efficiency-module-3": { speed: 0, productivity: 0, consumption: -0.5, pollution: 0 },
  "productivity-module": { speed: -0.05, productivity: 0.04, consumption: 0.4, pollution: 0.05 },
  "productivity-module-2": { speed: -0.1, productivity: 0.06, consumption: 0.6, pollution: 0.07 },
  "productivity-module-3": { speed: -0.15, productivity: 0.1, consumption: 0.8, pollution: 0.1 },
};
const MODULE_IDS = Object.keys(MODULES) as ModuleId[];

const TABS: Array<{ id: TabId; name: string }> = [
  { id: "mining", name: "Mining" },
  { id: "smelting", name: "Smelting" },
  { id: "energy", name: "Energy" },
  { id: "oil", name: "Oil" },
  { id: "products", name: "Products" },
  { id: "research", name: "Research" },
  { id: "military", name: "Military" },
  { id: "rocket", name: "Rocket" },
  { id: "logistics", name: "Logistics" },
  { id: "stats", name: "Stats" },
];

/** Coal fuel value in kJ. */
const COAL_FUEL_KJ = 4000;
/** Storage slots every item gets before chests. */
const BASE_STORAGE_SLOTS = 10;
/** Fluid every fluid can hold before storage tanks (pipes and machine buffers). */
const BASE_FLUID_STORAGE = 1000;
const TICKS_PER_SECOND = 10;
const TICK_SECONDS = 1 / TICKS_PER_SECOND;
/** Ores mined per second while holding the mine button. */
const MANUAL_MINING_RATE = 2;
const HAND_CRAFTING_SPEED = 1;

const ORE_IDS: OreId[] = ["iron-ore", "copper-ore", "coal", "stone"];
const MINE_RECIPE: Record<OreId, RecipeId> = {
  "iron-ore": "mine-iron-ore",
  "copper-ore": "mine-copper-ore",
  coal: "mine-coal",
  stone: "mine-stone",
};
const ORE_FIELD_ICON: Record<OreId, string> = {
  "iron-ore": iconUrl("Iron_ore_entity"),
  "copper-ore": iconUrl("Copper_ore_entity"),
  coal: iconUrl("Coal_entity"),
  stone: iconUrl("Stone_entity"),
};

const RESOURCE_IDS = Object.keys(RESOURCES) as ResourceId[];
const ITEM_IDS = RESOURCE_IDS.filter((id) => RESOURCES[id].kind !== "flow") as ItemId[];
const MACHINE_IDS = Object.keys(MACHINES) as MachineId[];
const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

const isFlow = (id: ResourceId): id is FlowId => RESOURCES[id].kind === "flow";
const isModule = (id: ResourceId): id is ModuleId => id in MODULES;
/** Recipes a player can craft by hand (assembler-only ones like engine units excluded). */
const isHandCraftable = (recipeId: RecipeId) => RECIPES[recipeId].category === "crafting" || RECIPES[recipeId].category === "building";
const entries = (amounts: Amounts) => Object.entries(amounts) as Array<[ResourceId, number]>;
const recipesFor = (machineId: MachineId) =>
  RECIPE_IDS.filter((id) => MACHINES[machineId].categories.includes(RECIPES[id].category));
/** The recipe the player uses to hand-craft an item, if any. */
const handRecipeFor = (item: ResourceId): RecipeDef | undefined =>
  Object.values(RECIPES).find((r) => isHandCraftable(r.id) && r.results[item] !== undefined);
/** Recipes that produce a resource, in catalog order (labs' placeholder recipe produces nothing). */
const recipesProducing = (id: ResourceId) => RECIPE_IDS.filter((r) => RECIPES[r].results[id] !== undefined);
/** Machine types that can run a recipe. */
const machinesFor = (recipeId: RecipeId) => MACHINE_IDS.filter((m) => MACHINES[m].categories.includes(RECIPES[recipeId].category));
const mainResult = (recipeId: RecipeId): ResourceId => entries(RECIPES[recipeId].results)[0]![0];

export {
  BASE_FLUID_STORAGE,
  BASE_STORAGE_SLOTS,
  COAL_FUEL_KJ,
  entries,
  HAND_CRAFTING_SPEED,
  handRecipeFor,
  isFlow,
  isHandCraftable,
  isModule,
  ITEM_IDS,
  machinesFor,
  MACHINE_IDS,
  MACHINES,
  mainResult,
  MANUAL_MINING_RATE,
  MINE_RECIPE,
  MODULE_IDS,
  MODULES,
  ORE_FIELD_ICON,
  ORE_IDS,
  RECIPE_IDS,
  RECIPES,
  recipesFor,
  recipesProducing,
  RESOURCE_IDS,
  RESOURCES,
  TABS,
  TICK_SECONDS,
  TICKS_PER_SECOND,
};
export type {
  Amounts,
  EnergyDef,
  FlowId,
  FluidId,
  ItemId,
  MachineDef,
  MachineId,
  ModuleEffect,
  ModuleId,
  OreId,
  RecipeCategory,
  RecipeDef,
  RecipeId,
  ResourceDef,
  ResourceId,
  ResourceKind,
  TabId,
};
