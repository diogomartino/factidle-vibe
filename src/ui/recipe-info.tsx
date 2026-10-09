import { Hand, Lock } from "lucide-react";
import { entries, machinesFor, RECIPES, recipesProducing, RESOURCES } from "../engine/catalog";
import type { RecipeCategory, RecipeId, ResourceId } from "../engine/catalog";
import { isUnlocked } from "../engine/unlocks";
import { useAppSelector } from "../store/store";
import { ResourceIcon } from "./design/resource-icon";
import { formatAmount, formatSeconds } from "./format-utils";

/** Continuous processes have no meaningful per-craft time to show. */
const TIMED: RecipeCategory[] = ["crafting", "advanced-crafting", "crafting-with-fluid", "building", "smelting", "oil-processing", "chemistry", "rocket-building"];
const HAND_MADE: RecipeCategory[] = ["crafting", "building", "mining"];

const Amount = ({ id, amount }: { id: ResourceId; amount: number }) => (
  <span className="inline-flex items-center gap-0.5 font-mono">
    <ResourceIcon id={id} size={16} />
    {formatAmount(amount, amount % 1 ? 1 : 0)}
  </span>
);

const RecipeLine = ({ recipeId }: { recipeId: RecipeId }) => {
  const unlocked = useAppSelector((s) => isUnlocked(s.game, recipeId));
  const recipe = RECIPES[recipeId];
  const ingredients = entries(recipe.ingredients);
  return (
    <div className={`flex flex-col gap-1 ${unlocked ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {ingredients.map(([id, n]) => (
          <Amount key={id} id={id} amount={n} />
        ))}
        {ingredients.length > 0 && <span className="text-muted">→</span>}
        {entries(recipe.results).map(([id, n]) => (
          <Amount key={id} id={id} amount={n} />
        ))}
        {TIMED.includes(recipe.category) && <span className="text-muted">· {formatSeconds(recipe.time)}</span>}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted">
        {unlocked ? "Made in" : <><Lock size={11} aria-hidden /> Locked · made in</>}
        {HAND_MADE.includes(recipe.category) && <Hand size={14} aria-label="by hand" />}
        {machinesFor(recipeId).map((m) => (
          <ResourceIcon key={m} id={m} size={16} />
        ))}
      </div>
    </div>
  );
};

/** How a resource is made: every recipe producing it, with ingredients, time and machines. */
const RecipeInfo = ({ id }: { id: ResourceId }) => {
  const recipes = recipesProducing(id);
  return (
    <div className="flex min-w-44 flex-col gap-2 py-0.5">
      <div className="flex items-center gap-1.5 font-semibold">
        <ResourceIcon id={id} size={18} />
        {RESOURCES[id].name}
      </div>
      {recipes.length === 0 ? <p className="text-muted">Not craftable.</p> : recipes.map((r) => <RecipeLine key={r} recipeId={r} />)}
    </div>
  );
};

/** Resource icon whose tooltip shows its recipe. */
const ItemIcon = ({ id, size, className }: { id: ResourceId; size?: number; className?: string }) => (
  <ResourceIcon id={id} size={size} className={className} tooltip={<RecipeInfo id={id} />} />
);

export { ItemIcon, RecipeInfo };
