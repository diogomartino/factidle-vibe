import { entries, RECIPES } from "../engine/catalog";
import type { ItemId, RecipeId } from "../engine/catalog";
import { useAppSelector } from "../store/store";
import { Chip } from "./design/chip";
import { ResourceIcon } from "./design/resource-icon";
import { formatSeconds, resourceName } from "./format-utils";

/** Ingredient chip for a recipe; amounts you don't have in stock are red. */
const RecipeCost = ({ recipe }: { recipe: RecipeId }) => {
  const def = RECIPES[recipe];
  const ingredients = entries(def.ingredients) as Array<[ItemId, number]>;
  // A string of short ingredients, so the chip only re-renders when one runs out or comes back.
  const short = useAppSelector((s) => ingredients.filter(([id, n]) => s.game.inventory[id] < n).map(([id]) => id).join(","));
  const summary = ingredients.map(([id, n]) => `${n} × ${resourceName(id)}`).join(", ");
  return (
    <Chip aria-label={`Cost: ${summary}`} tip={`${summary}\n${formatSeconds(def.time)} by hand`}>
      {ingredients.map(([id, n]) => (
        <span key={id} className={`inline-flex items-center gap-0.5 ${short.split(",").includes(id) ? "text-bad" : ""}`}>
          <ResourceIcon id={id} size={14} />
          {n}
        </span>
      ))}
    </Chip>
  );
};

export { RecipeCost };
