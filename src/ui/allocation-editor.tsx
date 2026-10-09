import { Plus, X } from "lucide-react";
import { MACHINES, mainResult, recipesFor, RECIPES } from "../engine/catalog";
import type { MachineId } from "../engine/catalog";
import { allocationTotal, assignedMachines } from "../engine/machines";
import { allocationAdded, allocationRemoved, allocationSet, assignmentAdded, machinesAssigned } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { Button, IconButton } from "./design/button";
import { Menu } from "./design/menu";
import { ResourceIcon } from "./design/resource-icon";
import { Slider } from "./design/slider";
import { Stepper } from "./design/stepper";
import { Tooltip } from "./design/tooltip";
import { formatPercent } from "./format-utils";
import { ItemIcon } from "./recipe-info";
import { sameViews, unitViews } from "./machine-utils";
import { UnitStatus } from "./unit-status";

/**
 * Splits a machine type between recipes: percentage shares for drills and furnaces, whole
 * machines for chemical plants and refineries.
 */
const AllocationEditor = ({ id }: { id: MachineId }) => {
  const dispatch = useAppDispatch();
  const machine = useAppSelector((s) => s.game.machines[id]);
  const unlocked = useAppSelector((s) => s.game.unlocked);
  const whole = MACHINES[id].wholeMachines === true;
  const options = recipesFor(id).filter((r) => unlocked.includes(r) && machine.allocations[r] === undefined);
  const total = allocationTotal(machine);
  const free = machine.count - assignedMachines(machine);
  const views = useAppSelector((s) => unitViews(s.game, id), sameViews);
  const name = MACHINES[id].name;
  const canAdd = options.length > 0 && (whole ? free > 0 : total < 1);

  const addMenu = canAdd && (
    <Menu
      label={`Add a recipe to ${name}s`}
      trigger={
        <Button variant="ghost" size="sm" className="h-6 text-muted hover:text-text">
          <Plus size={12} aria-hidden /> Add recipe
        </Button>
      }
      items={options.map((r) => ({
        key: r,
        label: RECIPES[r].name,
        icon: <ResourceIcon id={mainResult(r)} />,
        onSelect: () => dispatch((whole ? assignmentAdded : allocationAdded)({ machine: id, recipe: r })),
      }))}
    />
  );

  return (
    <div className="mt-1.5">
      <ul className="flex flex-col">
        {views.map((view) => {
          const recipe = RECIPES[view.recipe];
          return (
            <li
              key={view.recipe}
              className={`grid items-center gap-2 py-0.5 ${whole ? "grid-cols-[1rem_minmax(8rem,14rem)_auto_1fr_auto]" : "grid-cols-[1rem_minmax(6rem,14rem)_2.25rem_1fr_auto]"}`}
            >
              <ItemIcon id={view.product} />
              {whole ? (
                <>
                  <Tooltip content={recipe.name}>
                    <span className="truncate text-xs">{recipe.name}</span>
                  </Tooltip>
                  <Stepper
                    label={`${name}s on ${recipe.name}`}
                    value={view.share}
                    max={view.share + free}
                    onChange={(count) => dispatch(machinesAssigned({ machine: id, recipe: view.recipe, count }))}
                  />
                </>
              ) : (
                <>
                  <Slider
                    label={`${recipe.name} share of ${name}s`}
                    value={Math.round(view.share * 100)}
                    onChange={(percent) => dispatch(allocationSet({ machine: id, recipe: view.recipe, fraction: percent / 100 }))}
                  />
                  <span className="text-right font-mono text-xs">{formatPercent(view.share)}</span>
                </>
              )}
              <UnitStatus view={view} />
              <IconButton
                label={`Remove ${recipe.name}`}
                icon={<X size={12} />}
                className="size-6!"
                onClick={() => dispatch(allocationRemoved({ machine: id, recipe: view.recipe }))}
              />
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-2 text-xs text-muted">
        {views.length === 0 ? (
          <span>Idle. Add a recipe to put these machines to work.</span>
        ) : whole ? (
          free > 0 && <span>{free} unassigned</span>
        ) : (
          total < 1 && <span>{formatPercent(1 - total)} idle</span>
        )}
        {addMenu}
      </div>
    </div>
  );
};

export { AllocationEditor };
