import { mainResult, RECIPES } from "../engine/catalog";
import type { CraftJob } from "../engine/types";
import { craftCancelled } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { ProgressBar } from "./design/progress-bar";
import { ResourceIcon } from "./design/resource-icon";
import { ScrollArea } from "./design/scroll-area";
import { Tooltip } from "./design/tooltip";

/** Consecutive jobs with the same recipe, shown as one stacked icon. */
const stackJobs = (queue: CraftJob[]) =>
  queue.reduce<CraftJob[][]>((stacks, job) => {
    const last = stacks.at(-1);
    if (last && last[0]!.recipe === job.recipe) last.push(job);
    else stacks.push([job]);
    return stacks;
  }, []);

/**
 * The crafting queue in execution order: auto-crafted ingredients appear
 * before what needs them. Clicking a stack cancels its last craft (with the
 * craft it feeds into) and refunds everything.
 */
const QueueBar = () => {
  const dispatch = useAppDispatch();
  const queue = useAppSelector((s) => s.game.queue);
  if (queue.length === 0) return null;
  const head = queue[0]!;

  return (
    <section
      aria-label="Crafting queue"
      className="absolute bottom-3 left-1/2 z-30 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-lg border border-line-strong bg-panel/85 shadow-2xl backdrop-blur"
    >
      <ScrollArea horizontal>
        <ol className="flex gap-1.5 p-1.5">
          {stackJobs(queue).map((stack) => {
            const job = stack[0]!;
            const last = stack.at(-1)!;
            const name = RECIPES[job.recipe].name;
            const root = queue.find((j) => j.group === last.group && j.parent === null);
            const rootName = root ? RECIPES[root.recipe].name : name;
            const active = job === head;
            const progress = active ? head.progress / RECIPES[head.recipe].time : 0;
            const status = active ? `crafting, ${Math.round(progress * 100)}%` : "waiting";
            const cancels = rootName === name ? `one ${name.toLowerCase()}` : `${rootName.toLowerCase()} and its ingredients`;
            const label = `${stack.length} × ${name}, ${status}. Click to cancel ${cancels}.`;
            return (
              <li key={job.id}>
                <Tooltip content={`${stack.length} × ${name} (${status})\nClick to cancel ${cancels}`}>
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => dispatch(craftCancelled(last.group))}
                    className={`relative flex size-11 flex-col items-center justify-center rounded-md border hover:border-bad/60 hover:bg-bad/10 ${active ? "border-line-strong bg-raised" : "border-line"}`}
                  >
                    <ResourceIcon id={mainResult(job.recipe)} size={26} />
                    {stack.length > 1 && (
                      <span className="absolute right-0.5 bottom-1.5 font-mono text-[10px] leading-none font-bold text-text drop-shadow-[0_1px_1px_black]">
                        {stack.length}
                      </span>
                    )}
                    <ProgressBar value={progress} label={`${name} progress`} tone="good" className="absolute inset-x-1 bottom-0.5 h-0.5!" />
                  </button>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </section>
  );
};

export { QueueBar };
