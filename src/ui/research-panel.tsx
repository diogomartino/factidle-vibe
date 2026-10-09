import { Check, Lock, X } from "lucide-react";
import { RESOURCES } from "../engine/catalog";
import { researchCost, techStatus } from "../engine/research";
import type { TechStatus } from "../engine/research";
import { TECHNOLOGIES } from "../engine/technologies";
import type { TechDef, TechId } from "../engine/technologies";
import { researchDequeued, researchQueued } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { Button, IconButton } from "./design/button";
import { Chip } from "./design/chip";
import type { Tone } from "./design/chip";
import { EmptyState, Panel } from "./design/panel";
import { ProgressBar } from "./design/progress-bar";
import { ItemIcon } from "./recipe-info";
import { TechIcon } from "./tech-icon";
import { ResourceIcon } from "./design/resource-icon";
import { Tooltip } from "./design/tooltip";
import { bonusText, researchProgress, sortedTechs, triggerProgress, unlockIcons } from "./research-utils";

const STATUS: Record<TechStatus, { label: string; tone: Tone }> = {
  researched: { label: "Researched", tone: "good" },
  queued: { label: "Queued", tone: "strong" },
  available: { label: "Available", tone: "neutral" },
  locked: { label: "Locked", tone: "neutral" },
};

/** Science packs × units and time per unit, or the trigger condition. */
const TechCost = ({ tech }: { tech: TechDef }) => {
  const done = useAppSelector((s) => triggerProgress(s.game, tech)?.done ?? 0);
  if (tech.cost.kind === "trigger") {
    const total = tech.cost.amount;
    return (
      <Chip tip={`Researched automatically once you produce ${total} ${RESOURCES[tech.cost.item].name.toLowerCase()}`}>
        Produce <ResourceIcon id={tech.cost.item} size={14} /> {done}/{total}
      </Chip>
    );
  }
  const { count, time, packs } = tech.cost;
  return (
    <Chip tip={`${count} units, each taking ${time}s and one of each pack`}>
      {packs.map((pack) => (
        <ResourceIcon key={pack} id={pack} size={14} />
      ))}
      ×{count} · {time}s
    </Chip>
  );
};

const QueueItem = ({ id, active }: { id: TechId; active: boolean }) => {
  const dispatch = useAppDispatch();
  const tech = TECHNOLOGIES[id];
  const total = researchCost(id)?.count ?? 0;
  // Progress in 0.5% steps: smooth enough for the bar, and the card doesn't re-render every tick.
  const fraction = useAppSelector((s) => Math.floor((researchProgress(s.game, id).done / total) * 200) / 200);
  const done = useAppSelector((s) => Math.floor(researchProgress(s.game, id).done));
  return (
    <li className={`flex w-44 shrink-0 flex-col gap-1.5 rounded-md border p-2 ${active ? "border-line-strong bg-raised" : "border-line"}`}>
      <div className="flex items-center gap-2">
        <TechIcon tech={tech} size={28} />
        <Tooltip content={tech.name}>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{tech.name}</span>
        </Tooltip>
        <IconButton label={`Remove ${tech.name} from the queue`} icon={<X size={12} />} className="size-6!" onClick={() => dispatch(researchDequeued(id))} />
      </div>
      <ProgressBar value={fraction} label={`${tech.name} progress`} tone="good" />
      <span className="font-mono text-[11px] text-muted">
        {Math.floor(done)}/{total} units
      </span>
    </li>
  );
};

const TechRow = ({ tech }: { tech: TechDef }) => {
  const dispatch = useAppDispatch();
  // Primitive selectors: rows re-render when their status changes, not on every tick of research progress.
  const status = useAppSelector((s) => techStatus(s.game, tech.id));
  const missingText = useAppSelector((s) => tech.prerequisites.filter((p) => techStatus(s.game, p) !== "researched").join(","));
  const missing = missingText ? (missingText.split(",") as TechId[]) : [];
  // Trigger techs can't be queued: once their prerequisites are done they're simply in progress.
  const inProgress = tech.cost.kind === "trigger" && status === "locked" && missing.length === 0;
  const { label, tone } = inProgress ? { label: "In progress", tone: "warn" as const } : STATUS[status];
  return (
    <li className={`flex flex-wrap items-center gap-2 py-1.5 ${status === "researched" ? "opacity-60" : ""}`}>
      <TechIcon tech={tech} />
      <div className="flex min-w-40 flex-col">
        <span className="font-semibold">{tech.name}</span>
        {missing.length > 0 && <span className="text-[11px] text-muted">Requires {missing.map((p) => TECHNOLOGIES[p].name).join(", ")}</span>}
      </div>
      <Chip tone={tone}>
        {status === "researched" && <Check size={12} aria-hidden />}
        {status === "locked" && !inProgress && <Lock size={12} aria-hidden />}
        {label}
      </Chip>
      <TechCost tech={tech} />
      <span className="flex items-center gap-1" aria-label="Unlocks">
        {unlockIcons(tech).map((id) => (
          <ItemIcon key={id} id={id} size={20} />
        ))}
      </span>
      {tech.bonus && <Chip tone="good">{bonusText(tech)}</Chip>}
      <span className="ml-auto">
        {status === "available" && (
          <Tooltip content={missing.length > 0 ? "Also queues its missing prerequisites" : "Add to the research queue"}>
            <Button variant="primary" size="sm" onClick={() => dispatch(researchQueued(tech.id))}>
              Research
            </Button>
          </Tooltip>
        )}
        {status === "queued" && (
          <Button size="sm" onClick={() => dispatch(researchDequeued(tech.id))}>
            Dequeue
          </Button>
        )}
      </span>
    </li>
  );
};

/** Research queue and technology list. Trigger techs complete on their own; lab techs are queued. */
const ResearchPanel = () => {
  const queue = useAppSelector((s) => s.game.research.queue);
  const order = useAppSelector((s) => sortedTechs(s.game).map((t) => t.id).join(","));
  const techs = (order.split(",") as TechId[]).map((id) => TECHNOLOGIES[id]);
  return (
    <>
      <Panel aria-labelledby="research-queue">
        <h3 id="research-queue" className="mb-2 font-semibold">
          Research queue
        </h3>
        {queue.length === 0 ? (
          <EmptyState>Nothing queued. Labs idle until you pick a technology below.</EmptyState>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {queue.map((id, i) => (
              <QueueItem key={id} id={id} active={i === 0} />
            ))}
          </ol>
        )}
      </Panel>
      <Panel aria-labelledby="technologies">
        <h3 id="technologies" className="mb-1 font-semibold">
          Technologies
        </h3>
        <ul className="flex flex-col divide-y divide-line">
          {techs.map((tech) => (
            <TechRow key={tech.id} tech={tech} />
          ))}
        </ul>
      </Panel>
    </>
  );
};

export { ResearchPanel };
