import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { entries, MACHINES, RECIPES } from "../engine/catalog";
import type { ItemId, MachineId, RecipeId } from "../engine/catalog";
import { hasMissing, maxCraftable, previewCraft } from "../engine/crafting";
import type { Missing } from "../engine/crafting";
import type { GameState } from "../engine/types";
import { craftQueued } from "../store/game-slice";
import { store, useAppDispatch, useAppSelector } from "../store/store";
import { Button } from "./design/button";
import { Menu } from "./design/menu";
import type { MenuItem } from "./design/menu";
import { Tooltip } from "./design/tooltip";
import { resourceName } from "./format-utils";

const describeMissing = (missing: Missing) =>
  `Missing ${(Object.entries(missing) as Array<[ItemId, number]>).map(([id, n]) => `${n} × ${resourceName(id)}`).join(", ")}`;

/** What one craft lacks, as text; empty when affordable. A string, so the button only re-renders when it changes. */
const missingText = (game: GameState, recipe: RecipeId, count: number) => {
  // Fast path: every ingredient in stock, so no planning needed (runs every tick for every button).
  const stored = MACHINES[recipe as MachineId] && RECIPES[recipe].category === "building" && game.inventory[recipe as ItemId] >= count;
  if (stored || entries(RECIPES[recipe].ingredients).every(([id, n]) => game.inventory[id as ItemId] >= n * count)) return "";
  const missing = previewCraft(game, recipe, count);
  return hasMissing(missing) ? describeMissing(missing) : "";
};

/** Split button: queue one craft, or pick 5 / 10 / max from the menu. */
const BuildButton = ({ recipe }: { recipe: RecipeId }) => {
  const dispatch = useAppDispatch();
  const missingOne = useAppSelector((s) => missingText(s.game, recipe, 1));
  // The menu's options run the craft planner up to 100 times: build them only while it's open.
  const [open, setOpen] = useState(false);
  const verb = RECIPES[recipe].category === "building" ? "Build" : "Craft";
  const name = RECIPES[recipe].name;
  const queue = (count: number) => dispatch(craftQueued({ recipe, count }));

  const menuItems = (game: GameState): MenuItem[] => {
    const max = missingOne ? 0 : maxCraftable(game, recipe);
    return [
      ...[5, 10].map((count) => {
        const hint = missingText(game, recipe, count);
        return { key: `${count}`, label: `${verb} ${count}`, disabled: hint !== "", hint: hint || undefined, onSelect: () => queue(count) };
      }),
      { key: "max", label: `${verb} max`, hint: `${max}${max === 100 ? "+" : ""}`, disabled: max === 0, onSelect: () => queue(max) },
    ];
  };

  return (
    <span className="inline-flex">
      <Tooltip content={missingOne || `Queue 1 × ${name}`}>
        <Button variant="primary" size="sm" className="rounded-r-none" aria-disabled={missingOne !== ""} onClick={() => !missingOne && queue(1)}>
          {verb}
        </Button>
      </Tooltip>
      <Menu
        label={`${verb} ${name}`}
        onOpenChange={setOpen}
        trigger={
          <Button variant="primary" size="sm" aria-label={`More ${verb.toLowerCase()} amounts`} className="rounded-l-none border-l border-bg/20 px-1!">
            <ChevronDown size={14} aria-hidden />
          </Button>
        }
        items={open ? menuItems(store.getState().game) : []}
      />
    </span>
  );
};

export { BuildButton };
