import { ChevronDown, ChevronUp } from "lucide-react";
import { MACHINES } from "../engine/catalog";
import type { MachineId } from "../engine/catalog";
import { MAX_PRIORITY } from "../engine/machines";
import { prioritySet } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { IconButton } from "./design/button";
import { Tooltip } from "./design/tooltip";

/** Higher priority machines get first pick of shared inputs like coal and power. */
const PriorityControl = ({ id }: { id: MachineId }) => {
  const dispatch = useAppDispatch();
  const priority = useAppSelector((s) => s.game.machines[id].priority);
  const name = MACHINES[id].name;
  const set = (value: number) => dispatch(prioritySet({ machine: id, priority: value }));
  return (
    <span className="flex items-center rounded-md border border-line">
      <IconButton label={`Lower ${name} priority`} icon={<ChevronDown size={14} />} onClick={() => set(priority - 1)} disabled={priority <= -MAX_PRIORITY} />
      <Tooltip content="Priority: higher gets shared inputs (coal, power, plates) first">
        <span tabIndex={0} aria-label={`Priority ${priority}`} className="w-7 text-center font-mono text-xs">
          P{priority}
        </span>
      </Tooltip>
      <IconButton label={`Raise ${name} priority`} icon={<ChevronUp size={14} />} onClick={() => set(priority + 1)} disabled={priority >= MAX_PRIORITY} />
    </span>
  );
};

export { PriorityControl };
