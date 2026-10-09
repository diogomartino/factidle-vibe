import { useMemo } from "react";
import type uPlot from "uplot";
import { TICK_SECONDS } from "../../engine/catalog";
import type { StatTierDef } from "../../engine/stats";
import { useAppSelector } from "../../store/store";
import { formatQuantity, formatRate, formatSeconds, resourceName } from "../format-utils";
import { formatAgo, metricColumns } from "../stats-utils";
import type { ChartMode, ChartSelection, Metric } from "../stats-utils";
import { axis, CATEGORICAL_COLORS, zeroBasedRange } from "./chart-theme";
import { UPlotChart } from "./uplot-chart";

interface ProductionChartProps {
  /** Resources sharing one unit, each with its palette slot. */
  selection: ChartSelection[];
  metric: Metric;
  mode: ChartMode;
  tier: StatTierDef;
  height?: number;
  /** Charts with the same key share a crosshair. */
  syncKey?: string;
}

/** One line per selected resource for production or consumption, with a crosshair and live legend. */
const ProductionChart = ({ selection, metric, mode, tier, height = 240, syncKey }: ProductionChartProps) => {
  const history = useAppSelector((s) => s.game.stats.tiers[tier.id].history);
  const ids = useMemo(() => selection.map((s) => s.id), [selection]);
  const data = useMemo(() => metricColumns(tier, history, ids, metric, mode) as uPlot.AlignedData, [tier, history, ids, metric, mode]);
  const options = useMemo((): Omit<uPlot.Options, "width" | "height"> => {
    const unitOf = selection[0]!.id;
    const format = (v: number) => (mode === "rate" ? formatRate(unitOf, v) : formatQuantity(unitOf, v));
    const rate = (_u: uPlot, v: number | null) => (v == null ? "–" : format(v));
    return {
      scales: { x: { time: false }, y: { range: zeroBasedRange } },
      cursor: { drag: { x: false, y: false }, points: { size: 8 }, sync: syncKey ? { key: syncKey } : undefined },
      axes: [axis({ values: (_u, ticks) => ticks.map(formatAgo) }), axis({ size: 72, values: (_u, ticks) => ticks.map(format) })],
      series: [
        { label: "Time", value: (_u, v) => (v == null ? "–" : formatAgo(v)) },
        ...selection.map(({ id, slot }): uPlot.Series => {
          const stroke = CATEGORICAL_COLORS[slot]!;
          return { label: resourceName(id), stroke, width: 2, value: rate, points: { size: 6, fill: stroke } };
        }),
      ],
    };
  }, [selection, syncKey, mode]);

  if (history.length < 2)
    return (
      <p className="flex items-center justify-center text-xs text-muted" style={{ height }}>
        Collecting data… a sample is taken every {formatSeconds(tier.sampleTicks * TICK_SECONDS)}.
      </p>
    );
  return <UPlotChart options={options} data={data} height={height} />;
};

export { ProductionChart };
