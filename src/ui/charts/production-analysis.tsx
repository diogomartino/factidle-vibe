import { useId, useState } from "react";
import { STAT_TIERS } from "../../engine/stats";
import type { StatTierId } from "../../engine/types";
import { SegmentedControl } from "../design/segmented-control";
import { tierById } from "../stats-utils";
import type { ChartMode, ChartSelection } from "../stats-utils";
import { ProductionChart } from "./production-chart";
import { SeriesPicker } from "./series-picker";

const TIER_OPTIONS = STAT_TIERS.map((t) => ({ value: t.id, label: t.label }));
const MODE_OPTIONS: Array<{ value: ChartMode; label: string }> = [
  { value: "rate", label: "Rate" },
  { value: "total", label: "Total" },
];

interface ProductionAnalysisProps {
  selection: ChartSelection[];
  onSelectionChange: (selection: ChartSelection[]) => void;
  tier: StatTierId;
  onTierChange: (tier: StatTierId) => void;
  height?: number;
}

/** Factorio-style production screen: produced and consumed side by side, with a shared crosshair. */
const ProductionAnalysis = ({ selection, onSelectionChange, tier, onTierChange, height }: ProductionAnalysisProps) => {
  const def = tierById(tier);
  const syncKey = useId();
  const [mode, setMode] = useState<ChartMode>("rate");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <SeriesPicker selection={selection} onChange={onSelectionChange} />
        <span className="ml-auto flex gap-2">
          <SegmentedControl label="Chart values" value={mode} options={MODE_OPTIONS} onChange={setMode} />
          <SegmentedControl label="Time scale" value={tier} options={TIER_OPTIONS} onChange={onTierChange} />
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {(["produced", "consumed"] as const).map((metric) => (
          <section key={metric} aria-label={`${metric === "produced" ? "Production" : "Consumption"} chart`}>
            <h4 className="mb-1 text-xs font-semibold text-muted">{metric === "produced" ? "Produced" : "Consumed"}</h4>
            <ProductionChart selection={selection} metric={metric} mode={mode} tier={def} height={height} syncKey={syncKey} />
          </section>
        ))}
      </div>
    </div>
  );
};

export { ProductionAnalysis };
