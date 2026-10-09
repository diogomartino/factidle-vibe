import { AlertTriangle, Info } from "lucide-react";
import type { Limit } from "../engine/types";
import { IconButton } from "./design/button";
import { Popover } from "./design/popover";
import { ResourceIcon } from "./design/resource-icon";
import { formatPercent } from "./format-utils";
import { describeLimit } from "./machine-utils";

const ICON_TONE = { bad: "text-bad", warn: "text-warn", neutral: "text-muted", strong: "text-muted", good: "text-good" } as const;

/** A small icon flagging why a machine runs below full speed; the popover explains it. */
const BottleneckIndicator = ({ limit, ratio }: { limit: Limit; ratio: number }) => {
  const { text, tone, detail } = describeLimit(limit);
  const Icon = tone === "neutral" ? Info : AlertTriangle;
  return (
    <Popover
      className="w-64"
      trigger={<IconButton label={`${text}: details`} icon={<Icon size={14} className={ICON_TONE[tone]} />} className="size-6!" />}
    >
      <div className="flex flex-col gap-1.5 text-xs">
        <h3 className={`flex items-center gap-1.5 font-semibold ${ICON_TONE[tone]}`}>
          <Icon size={14} aria-hidden />
          {text}
        </h3>
        <p className="flex items-center gap-1.5 text-muted">
          Limited by <ResourceIcon id={limit.resource} size={14} />
          <span className="text-text">{limit.side === "input" ? "input" : limit.side === "target" ? "stock target" : "output"}</span>· running at
          <span className="font-mono text-text">{formatPercent(ratio)}</span>
        </p>
        <p className="text-muted">{detail}</p>
      </div>
    </Popover>
  );
};

export { BottleneckIndicator };
