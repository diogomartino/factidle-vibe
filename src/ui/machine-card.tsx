import { Settings2, Zap } from "lucide-react";
import { MACHINES } from "../engine/catalog";
import { ACCUMULATOR_KJ } from "../engine/production";
import type { MachineId } from "../engine/catalog";
import { machineToggled, runningSet } from "../store/game-slice";
import { assignedMachines, runningCount } from "../engine/machines";
import { useAppDispatch, useAppSelector } from "../store/store";
import { AllocationEditor } from "./allocation-editor";
import { BuildButton } from "./build-button";
import { IconButton } from "./design/button";
import { Chip } from "./design/chip";
import { Panel } from "./design/panel";
import { Popover } from "./design/popover";
import { ResourceIcon } from "./design/resource-icon";
import { Slider } from "./design/slider";
import { Switch } from "./design/switch";
import { Tooltip } from "./design/tooltip";
import { ProgressBar } from "./design/progress-bar";
import { formatEnergy, formatRate, formatRatePair } from "./format-utils";
import { recentLoss } from "./combat-utils";
import { ModuleChip, ModuleEditor } from "./module-editor";
import { energyUse, sameViews, unitViews } from "./machine-utils";
import type { GameState } from "../engine/types";
import { LabStatus } from "./lab-status";
import { PriorityControl } from "./priority-control";
import { ItemIcon } from "./recipe-info";
import { RecipeCost } from "./recipe-cost";
import { UnitStatus } from "./unit-status";

/** "text|starved" for the energy chip: a string, so it re-renders only when the display changes. */
const energyText = (game: GameState, id: MachineId) => {
  const use = energyUse(game, id);
  return use ? `${formatRatePair(use.resource, use.actual, use.potential)}|${use.starved ? "starved" : ""}` : "";
};

const EnergyChip = ({ id }: { id: MachineId }) => {
  const display = useAppSelector((s) => energyText(s.game, id));
  if (!display) return null;
  const [text, starvedFlag] = display.split("|");
  const starved = starvedFlag === "starved";
  const coal = MACHINES[id].energy?.kind === "burner";
  const label = coal ? "Coal burned" : "Power used";
  return (
    <Chip
      tone={starved ? "bad" : "neutral"}
      aria-label={`${label}: ${text}`}
      tip={`${label}: actual / at full speed${starved ? "\nNot enough to run at full speed!" : ""}`}
    >
      {coal ? <ResourceIcon id="coal" size={14} /> : <Zap size={13} className="text-warn" />}
      {text}
    </Chip>
  );
};

/** On/off and priority live behind a button: rarely changed, always visible as chips when non-default. */
/** Charge level and current flow of all accumulators. */
const AccumulatorStatus = () => {
  const stored = useAppSelector((s) => s.game.storedEnergy);
  const count = useAppSelector((s) => s.game.machines.accumulator.count);
  const flow = useAppSelector((s) => s.game.report.power.accumulatorFlow);
  const capacity = count * ACCUMULATOR_KJ;
  const state = flow > 1e-6 ? "Charging" : flow < -1e-6 ? "Discharging" : "Idle";
  return (
    <Chip tip={`${state}. Stored energy / capacity`} aria-label={`${state}, ${formatEnergy(stored)} of ${formatEnergy(capacity)} stored`}>
      <ProgressBar value={capacity > 0 ? stored / capacity : 0} label="Accumulator charge" tone={flow < -1e-6 ? "warn" : "good"} className="w-12" />
      {formatEnergy(stored)} / {formatEnergy(capacity)}
      {Math.abs(flow) > 1e-6 && <span className={flow > 0 ? "text-good" : "text-warn"}>{formatRate("electricity", flow, true)}</span>}
    </Chip>
  );
};

const MachineSettings = ({ id }: { id: MachineId }) => {
  const dispatch = useAppDispatch();
  const { enabled, running, count } = useAppSelector((s) => s.game.machines[id]);
  const name = MACHINES[id].name;
  const percent = Math.round(running * 100);
  return (
    <Popover trigger={<IconButton label={`${name} settings`} icon={<Settings2 size={14} />} />} className="w-72">
      <div className="flex flex-col gap-3 text-xs">
        <h3 className="font-semibold">{name}s</h3>
        <div className="flex items-center justify-between">
          Running
          <Switch label={`${name}s running`} checked={enabled} onChange={() => dispatch(machineToggled(id))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between">
            Machines running
            <span className="font-mono text-muted">
              {percent}% · {runningCount({ count, running })} of {count}
            </span>
          </span>
          <Slider label={`Share of ${name}s running`} value={percent} onChange={(value) => dispatch(runningSet({ machine: id, fraction: value / 100 }))} />
        </div>
        {MACHINES[id].fixedPriority === undefined && (
          <div className="flex items-center justify-between">
            Priority
            <PriorityControl id={id} />
          </div>
        )}
        <p className="text-muted">Idle machines use no fuel or power. Higher priority machines take shared coal, power and items first.</p>
        <ModuleEditor id={id} />
      </div>
    </Popover>
  );
};

/** Owned count, build controls, live throughput and configuration for one machine type. */
/** Live output of a fixed-recipe machine (pump, boiler, engine, solar, pumpjack, silo). */
const FixedRecipeStatus = ({ id }: { id: MachineId }) => {
  const views = useAppSelector((s) => unitViews(s.game, id), sameViews);
  return views.map((view) => <UnitStatus key={view.recipe} view={view} />);
};

const MachineCard = ({ id }: { id: MachineId }) => {
  // The machine object only changes when its settings or count do; live numbers are selected by the chips below.
  const machine = useAppSelector((s) => s.game.machines[id]);
  const lostRecently = useAppSelector((s) => recentLoss(s.game) === id);
  const losses = useAppSelector((s) => s.game.combat.losses[id] ?? 0);
  const def = MACHINES[id];
  const runsRecipes = def.categories.length > 0;
  // Assemblers are assigned in the product table instead of on the card.
  const assembler = def.categories.includes("crafting");
  const free = machine.count - assignedMachines(machine);
  const headingId = `machine-${id}`;

  return (
    <Panel
      aria-labelledby={headingId}
      className={`p-2.5! ${machine.enabled ? "" : "opacity-70"} ${lostRecently ? "border-bad! shadow-[0_0_12px_-2px_var(--color-bad)]" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ItemIcon id={id} size={24} />
        <Tooltip content={def.description}>
          <h3 id={headingId} tabIndex={0} className="font-semibold">
            {def.name}
          </h3>
        </Tooltip>
        <Chip tone="strong" aria-label={`${machine.count} owned`} tip="Owned">
          ×{machine.count}
        </Chip>
        {!machine.enabled && (
          <Chip tone="bad" tip="Turned off in settings">
            Off
          </Chip>
        )}
        {machine.running < 1 && (
          <Chip tip={`${Math.round(machine.running * 100)}% of machines set to run; change it in settings`}>
            {runningCount(machine)} running
          </Chip>
        )}
        {machine.priority !== 0 && <Chip tip="Priority for shared inputs; change it in settings">P{machine.priority}</Chip>}
        {def.wholeMachines && (
          <Chip tone={free > 0 ? "warn" : "neutral"} tip={`Not assigned to any recipe. Assign them ${assembler ? "in the table" : "to recipes"} below.`}>
            {free} free
          </Chip>
        )}
        {lostRecently && (
          <Chip tone="bad" className="animate-pulse" tip={`Biters destroyed ${losses} so far. Defend the base in the Military tab.`}>
            Destroyed by biters
          </Chip>
        )}
        <EnergyChip id={id} />
        <ModuleChip id={id} />
        {id === "accumulator" && machine.count > 0 && <AccumulatorStatus />}
        {def.fixedRecipe === "research" ? <LabStatus /> : def.fixedRecipe && <FixedRecipeStatus id={id} />}
        <span className="ml-auto flex items-center gap-1.5">
          <RecipeCost recipe={id} />
          {runsRecipes && <MachineSettings id={id} />}
          <BuildButton recipe={id} />
        </span>
      </div>
      {runsRecipes && !def.fixedRecipe && !assembler && <AllocationEditor id={id} />}
    </Panel>
  );
};

export { MachineCard };
