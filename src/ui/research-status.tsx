import { FlaskConical, Target } from "lucide-react";
import { shallowEqual } from "react-redux";
import { TECHNOLOGIES } from "../engine/technologies";
import type { GameState, Limit } from "../engine/types";
import { useAppDispatch, useAppSelector } from "../store/store";
import { tabSelected } from "../store/ui-slice";
import { BottleneckIndicator } from "./bottleneck-indicator";
import { ProgressBar } from "./design/progress-bar";
import { Tooltip } from "./design/tooltip";
import { formatDuration, formatPercent } from "./format-utils";
import { labThroughput, researchGoal, researchProgress } from "./research-utils";
import { TechIcon } from "./tech-icon";

const PILL = "flex h-8 items-center gap-2 rounded-md border border-line bg-panel px-2 text-xs hover:bg-raised";

/** Everything the pill shows, as rounded primitives: compared shallowly, it changes a few times per research, not every tick. */
const researchDisplay = (game: GameState) => {
  const lab = labThroughput(game);
  if (!lab) return { kind: "goal" as const, goal: researchGoal(game) ?? "" };
  const { done, total } = researchProgress(game, lab.tech.id);
  const remaining = lab.actual > 0 ? (total - done) / lab.actual : Infinity;
  return {
    kind: "research" as const,
    tech: lab.tech.id,
    done: Math.floor(done),
    total,
    fraction: Math.floor((done / total) * 200) / 200,
    eta: Number.isFinite(remaining) ? `${formatDuration(remaining)} left` : "stalled",
    slowed: !lab.unit || lab.unit.ratio <= 0.999,
    limitResource: lab.unit?.limit?.resource,
    limitSide: lab.unit?.limit?.side,
    ratio: Math.round((lab.unit?.ratio ?? 0) * 100) / 100,
  };
};

/** Current research with progress and lab status, or the next goal; both open the Research tab. */
const ResearchStatus = () => {
  const dispatch = useAppDispatch();
  const display = useAppSelector((s) => researchDisplay(s.game), shallowEqual);
  const openResearch = () => dispatch(tabSelected("research"));

  if (display.kind === "goal") {
    if (!display.goal) return null;
    return (
      <Tooltip content="Next goal. Click to open the Research tab.">
        <button type="button" className={PILL} onClick={openResearch}>
          <Target size={13} className="text-accent" aria-hidden />
          {display.goal}
        </button>
      </Tooltip>
    );
  }

  const { done, total, fraction, eta, slowed, limitResource, limitSide, ratio } = display;
  const tech = TECHNOLOGIES[display.tech];
  const limit: Limit | null = limitResource && limitSide ? { resource: limitResource, side: limitSide } : null;
  return (
    <span className="flex items-center gap-1">
      <Tooltip content={`Researching ${tech.name}: ${done}/${total} units, ${eta}. Click to open the Research tab.`}>
        <button type="button" className={PILL} onClick={openResearch} aria-label={`Researching ${tech.name}, ${formatPercent(fraction)}, ${eta}`}>
          <FlaskConical size={13} className="text-accent" aria-hidden />
          <TechIcon tech={tech} size={20} />
          <span className="max-w-40 truncate font-medium">{tech.name}</span>
          <ProgressBar value={fraction} label={`${tech.name} progress`} tone="good" className="w-20" />
          <span className="font-mono text-muted">{formatPercent(fraction)}</span>
          <span className={`font-mono ${slowed ? "text-warn" : "text-muted"}`}>{eta}</span>
        </button>
      </Tooltip>
      {limit && <BottleneckIndicator limit={limit} ratio={ratio} />}
    </span>
  );
};

export { ResearchStatus };
