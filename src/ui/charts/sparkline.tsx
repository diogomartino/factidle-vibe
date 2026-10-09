import { useMemo } from "react";
import type uPlot from "uplot";
import type { ResourceId } from "../../engine/catalog";
import { useAppSelector } from "../../store/store";
import { MUTED_LINE } from "./chart-theme";
import { rateSeries, tierById } from "../stats-utils";
import { UPlotChart } from "./uplot-chart";

const LAST_MINUTE = tierById("1m");

const OPTIONS: Omit<uPlot.Options, "width" | "height"> = {
  legend: { show: false },
  cursor: { show: false },
  select: { show: false, left: 0, top: 0, width: 0, height: 0 },
  axes: [{ show: false }, { show: false }],
  scales: { x: { time: false } },
  padding: [2, 0, 2, 0],
  series: [{}, { stroke: MUTED_LINE, width: 1.25, points: { show: false } }],
};

/** Net rate over the last minute. */
const Sparkline = ({ id }: { id: ResourceId }) => {
  const history = useAppSelector((s) => s.game.stats.tiers[LAST_MINUTE.id].history);
  const data = useMemo((): uPlot.AlignedData => {
    const [x, produced, consumed] = rateSeries(LAST_MINUTE, history, id);
    return [x, produced.map((p, i) => p - consumed[i]!)];
  }, [history, id]);
  return <UPlotChart options={OPTIONS} data={data} height={16} className="pointer-events-none" />;
};

export { Sparkline };
