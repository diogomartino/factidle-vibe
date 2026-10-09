import { BottleneckIndicator } from "./bottleneck-indicator";
import { formatRate, formatRatePair } from "./format-utils";
import { describeLimit } from "./machine-utils";
import type { UnitView } from "./machine-utils";

/** Actual vs potential output of one allocation, plus why it is slowed down. */
const UnitStatus = ({ view }: { view: UnitView }) => {
  const limit = view.limit && view.potential > 0 ? describeLimit(view.limit) : null;
  // Idling for lack of demand is fine; only real bottlenecks are highlighted.
  const slowed = view.ratio < 0.999 && view.potential > 0 && limit?.tone !== "neutral";
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`font-mono text-xs whitespace-nowrap tabular-nums ${slowed ? "text-warn" : "text-muted"}`}
        aria-label={`${formatRate(view.product, view.actual)} of ${formatRate(view.product, view.potential)} possible`}
      >
        {formatRatePair(view.product, view.actual, view.potential)}
      </span>
      {limit && view.limit && <BottleneckIndicator limit={view.limit} ratio={view.ratio} />}
    </span>
  );
};

export { UnitStatus };
