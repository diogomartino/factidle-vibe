import { Check } from "lucide-react";
import { isHandCraftable, MACHINE_IDS, MACHINES, mainResult, RECIPE_IDS, RECIPES, recipesFor } from "../engine/catalog";
import type { ItemId, MachineId, RecipeCategory, RecipeId } from "../engine/catalog";
import { assignedMachines } from "../engine/machines";
import { machinesAssigned, stockTargetSet } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { BuildButton } from "./build-button";
import { Input } from "./design/input";
import { EmptyState, Panel } from "./design/panel";
import { ResourceIcon } from "./design/resource-icon";
import { Stepper } from "./design/stepper";
import { Tooltip } from "./design/tooltip";
import { formatAmount } from "./format-utils";
import { sameView, unitViews } from "./machine-utils";
import type { UnitView } from "./machine-utils";
import { RecipeCost } from "./recipe-cost";
import { ItemIcon } from "./recipe-info";
import { UnitStatus } from "./unit-status";

const ASSEMBLERS = MACHINE_IDS.filter((id) => MACHINES[id].categories.includes("crafting"));
const PRODUCT_CATEGORIES: RecipeCategory[] = ["crafting", "advanced-crafting", "crafting-with-fluid"];

/** One output figure for a recipe made by several assembler types. */
const combineViews = (views: UnitView[]): UnitView | null => {
  if (views.length === 0) return null;
  const potential = views.reduce((sum, v) => sum + v.potential, 0);
  const actual = views.reduce((sum, v) => sum + v.actual, 0);
  return {
    ...views[0]!,
    potential,
    actual,
    ratio: potential > 0 ? actual / potential : 0,
    limit: views.find((v) => v.limit)?.limit ?? null,
  };
};

/** "Keep N in stock": machines making this item pause once storage holds N. Empty means no target. */
const StockTarget = ({ item, name }: { item: ItemId; name: string }) => {
  const dispatch = useAppDispatch();
  const target = useAppSelector((s) => s.game.stockTargets[item]);
  return (
    <Tooltip content="Assemblers pause once storage holds this many. Leave empty for no limit.">
      <Input
        type="number"
        min={0}
        step={10}
        inputMode="numeric"
        placeholder="∞"
        aria-label={`Keep ${name} in stock`}
        value={target ?? ""}
        onChange={(e) =>
          dispatch(
            stockTargetSet({
              item,
              target: e.target.value === "" ? null : Number(e.target.value),
            }),
          )
        }
        className="h-7 w-16 text-right"
      />
    </Tooltip>
  );
};

/** A stepper per assembler type that can make the recipe. */
const AssemblerSteppers = ({ recipe, assemblers }: { recipe: RecipeId; assemblers: MachineId[] }) => {
  const dispatch = useAppDispatch();
  const machines = useAppSelector((s) => s.game.machines);
  const name = RECIPES[recipe].name;
  return (
    <span className="flex items-center gap-1.5">
      {assemblers.map((id) => {
        if (!recipesFor(id).includes(recipe))
          return (
            <Tooltip key={id} content={`${MACHINES[id].name} can't handle fluids`}>
              <span className="w-[4.75rem] text-center text-xs text-muted">–</span>
            </Tooltip>
          );
        const machine = machines[id];
        const assigned = machine.allocations[recipe] ?? 0;
        return (
          <span key={id} className="inline-flex items-center gap-0.5">
            {assemblers.length > 1 && <ResourceIcon id={id} size={16} />}
            <Stepper
              label={`${MACHINES[id].name}s making ${name}`}
              value={assigned}
              max={assigned + machine.count - assignedMachines(machine)}
              onChange={(count) => dispatch(machinesAssigned({ machine: id, recipe, count }))}
            />
          </span>
        );
      })}
    </span>
  );
};

/** Stock, and the target when one is set. Selects text so it only re-renders when the display changes. */
const StockCell = ({ item }: { item: ItemId }) => {
  const amount = useAppSelector((s) => formatAmount(s.game.inventory[item]));
  const target = useAppSelector((s) => s.game.stockTargets[item]);
  const reached = useAppSelector((s) => target !== undefined && s.game.inventory[item] >= target);
  return (
    <td className="py-1 pr-2 text-right font-mono text-xs whitespace-nowrap">
      <span className={reached ? "text-good" : ""}>{amount}</span>
      {target !== undefined && <span className="text-muted"> / {formatAmount(target)}</span>}
      {reached && <Check size={12} className="ml-1 inline text-good" aria-label="target reached" />}
    </td>
  );
};

/** Combined output of every assembler type on this recipe. */
const OutputCell = ({ recipe, assemblers }: { recipe: RecipeId; assemblers: MachineId[] }) => {
  const view = useAppSelector(
    (s) => combineViews(assemblers.flatMap((id) => unitViews(s.game, id).filter((v) => v.recipe === recipe && v.share > 0))),
    sameView,
  );
  return <td className="py-1 pr-2">{view ? <UnitStatus view={view} /> : <span className="text-xs text-muted">–</span>}</td>;
};

const ProductRow = ({ recipe, assemblers }: { recipe: RecipeId; assemblers: MachineId[] }) => {
  const item = mainResult(recipe) as ItemId;
  const name = RECIPES[recipe].name;
  const handMade = isHandCraftable(recipe) && RECIPES[recipe].category !== "building";

  return (
    <tr className="border-t border-line">
      <td className="py-1 pr-2">
        <span className="flex items-center gap-2">
          <ItemIcon id={item} size={22} />
          <span className="font-medium whitespace-nowrap">{name}</span>
        </span>
      </td>
      <StockCell item={item} />
      <td className="py-1 pr-2">
        <RecipeCost recipe={recipe} />
      </td>
      {assemblers.length > 0 && (
        <>
          <td className="py-1 pr-2">
            <AssemblerSteppers recipe={recipe} assemblers={assemblers} />
          </td>
          <OutputCell recipe={recipe} assemblers={assemblers} />
          <td className="py-1 pr-2">
            <StockTarget item={item} name={name} />
          </td>
        </>
      )}
      <td className="py-1 text-right">
        {handMade ? (
          <BuildButton recipe={recipe} />
        ) : (
          <Tooltip content={RECIPES[recipe].category === "building" ? "Build it from its card to place it" : "Only assemblers can make this"}>
            <span className="text-xs text-muted">–</span>
          </Tooltip>
        )}
      </td>
    </tr>
  );
};

const ProductTable = ({ id, title, recipes, assemblers }: { id: string; title: string; recipes: RecipeId[]; assemblers: MachineId[] }) => {
  const head = "pb-1 pr-2 text-left text-[11px] font-medium text-muted";
  return (
    <div className="overflow-x-auto">
      <table className="w-full" aria-labelledby={id}>
        <caption id={id} className="pt-2 pb-1 text-left text-xs font-semibold text-muted">
          {title}
        </caption>
        <thead>
          <tr>
            <th className={head}>Product</th>
            <th className={`${head} text-right`}>In stock</th>
            <th className={head}>Cost</th>
            {assemblers.length > 0 && (
              <>
                <th className={head}>Assemblers</th>
                <th className={head}>Output (actual / max)</th>
                <th className={head}>Keep in stock</th>
              </>
            )}
            <th className={`${head} text-right`}>Hand craft</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((recipe) => (
            <ProductRow key={recipe} recipe={recipe} assemblers={assemblers} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Every craftable product in one table: stock, hand crafting, and (after Automation) how many
 * assemblers of each type make it and a keep-in-stock target. Assemblers can also make
 * buildings into storage, e.g. electric furnaces for production science.
 */
const ProductList = () => {
  // Unlocks and machines only change on research or building, so these lists stay stable between ticks.
  const unlocked = useAppSelector((s) => s.game.unlocked);
  const machines = useAppSelector((s) => s.game.machines);
  const products = RECIPE_IDS.filter((id) => PRODUCT_CATEGORIES.includes(RECIPES[id].category) && unlocked.includes(id));
  const buildings = RECIPE_IDS.filter((id) => RECIPES[id].category === "building" && unlocked.includes(id));
  const assemblers = ASSEMBLERS.filter((id) => unlocked.includes(id) && machines[id].count > 0);
  return (
    <Panel aria-labelledby="products-table">
      <h3 id="products-table" className="font-semibold">
        Products
      </h3>
      {assemblers.length === 0 && (
        <div className="mt-2">
          <EmptyState>
            {unlocked.includes("assembling-machine-1")
              ? "Build an assembling machine to automate crafting: assign it to a product here."
              : "Research Automation to unlock assembling machines and automate crafting."}
          </EmptyState>
        </div>
      )}
      <ProductTable id="intermediates" title="Intermediate products" recipes={products} assemblers={assemblers} />
      {assemblers.length > 0 && (
        <ProductTable
          id="assembled-buildings"
          title="Buildings (made into storage; Build uses stored ones first)"
          recipes={buildings}
          assemblers={assemblers}
        />
      )}
    </Panel>
  );
};

export { ProductList };
