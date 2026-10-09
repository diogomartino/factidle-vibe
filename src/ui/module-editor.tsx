import { MODULE_IDS, RESOURCES } from "../engine/catalog";
import type { MachineId, ModuleId } from "../engine/catalog";
import { machineEffects, moduleSlots } from "../engine/effects";
import { installedModules } from "../engine/machines";
import type { GameState } from "../engine/types";
import { isUnlocked } from "../engine/unlocks";
import { modulesSet } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { Chip } from "./design/chip";
import { ResourceIcon } from "./design/resource-icon";
import { Stepper } from "./design/stepper";
import { Tooltip } from "./design/tooltip";

const signed = (fraction: number) => `${fraction > 0 ? "+" : ""}${Math.round(fraction * 100)}%`;

/** "+20% speed · +50% energy": module effects averaged per machine. */
const effectSummary = (state: GameState, id: MachineId) => {
  const { speed, consumption, productivity } = machineEffects(state, id);
  const parts: string[] = [];
  if (Math.abs(speed - 1) > 1e-6 && id !== "lab") parts.push(`${signed(speed - 1)} speed`);
  if (productivity > 1e-6) parts.push(`${signed(productivity)} productivity`);
  if (Math.abs(consumption - 1) > 1e-6) parts.push(`${signed(consumption - 1)} energy`);
  return parts.join(" · ");
};

/** Installed modules at a glance on the machine card. */
const ModuleChip = ({ id }: { id: MachineId }) => {
  const modules = useAppSelector((s) => s.game.machines[id].modules);
  const summary = useAppSelector((s) => effectSummary(s.game, id));
  const installed = Object.entries(modules) as Array<[ModuleId, number]>;
  if (installed.length === 0) return null;
  return (
    <Chip tip={`Modules: ${summary} per machine on average`}>
      {installed.map(([module, n]) => (
        <span key={module} className="inline-flex items-center gap-0.5">
          <ResourceIcon id={module} size={14} />
          {n}
        </span>
      ))}
    </Chip>
  );
};

/**
 * Installs modules from storage into a machine type. Modules are shared by all machines of the
 * type, so the effect is averaged: 3 speed modules on 3 drills act like one per drill.
 */
const ModuleEditor = ({ id }: { id: MachineId }) => {
  const dispatch = useAppDispatch();
  const game = useAppSelector((s) => s.game);
  const machine = game.machines[id];
  const slots = moduleSlots(game, id);
  const free = slots - installedModules(game, id);
  const unlocked = MODULE_IDS.some((m) => isUnlocked(game, m));
  // Only modules you can install (or remove): in storage or already installed.
  const modules = MODULE_IDS.filter((m) => game.inventory[m] >= 1 || (machine.modules[m] ?? 0) > 0);
  if (slots === 0 || !unlocked) return null;
  const summary = effectSummary(game, id);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between">
        Modules
        <span className="font-mono text-muted">
          {slots - free} / {slots} slots
        </span>
      </span>
      {modules.length === 0 && <p className="text-muted">No modules in storage. Craft some in the Products tab.</p>}
      <ul className="flex flex-col gap-1">
        {modules.map((module) => {
          const installed = machine.modules[module] ?? 0;
          const name = RESOURCES[module].name;
          return (
            <li key={module} className="flex items-center gap-1.5">
              <ResourceIcon id={module} size={18} />
              <Tooltip content={`${Math.floor(game.inventory[module])} in storage`}>
                <span className="min-w-0 flex-1 truncate">{name}</span>
              </Tooltip>
              <Stepper
                label={`${name}s installed`}
                value={installed}
                max={installed + Math.min(free, Math.floor(game.inventory[module]))}
                onChange={(count) => dispatch(modulesSet({ machine: id, module, count }))}
              />
            </li>
          );
        })}
      </ul>
      {summary && <p className="text-muted">Per machine: {summary}.</p>}
    </div>
  );
};

export { ModuleChip, ModuleEditor };
