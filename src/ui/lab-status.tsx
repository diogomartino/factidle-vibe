import { useAppSelector } from "../store/store";
import { BottleneckIndicator } from "./bottleneck-indicator";
import { Chip } from "./design/chip";
import { labThroughput } from "./research-utils";

/** What the labs are researching and how fast, in research units per second. */
const LabStatus = () => {
  const lab = labThroughput(useAppSelector((s) => s.game));
  if (!lab) return <Chip tip="Queue a technology below">Idle: nothing to research</Chip>;
  if (!lab.unit) return <Chip tone="warn">No labs running</Chip>;
  const slowed = lab.unit.limit !== null && lab.unit.ratio < 0.999;
  return (
    <span className="flex items-center gap-1.5">
      <span className={`font-mono text-xs whitespace-nowrap ${slowed ? "text-warn" : "text-muted"}`}>
        {lab.actual.toFixed(2)} / {lab.potential.toFixed(2)} units/s
      </span>
      {lab.unit.limit && <BottleneckIndicator limit={lab.unit.limit} ratio={lab.unit.ratio} />}
    </span>
  );
};

export { LabStatus };
