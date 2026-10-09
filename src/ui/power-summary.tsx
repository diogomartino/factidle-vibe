import { MACHINES } from "../engine/catalog";
import type { FlowId } from "../engine/catalog";
import { runningCount } from "../engine/machines";
import { useAppSelector } from "../store/store";
import { Panel } from "./design/panel";
import { ProgressBar } from "./design/progress-bar";
import { ResourceIcon } from "./design/resource-icon";
import { formatPercent, formatPower, formatRate, resourceName } from "./format-utils";
import { powerBreakdown } from "./machine-utils";
import { ItemIcon } from "./recipe-info";

const FLOWS: FlowId[] = ["water", "steam", "electricity"];

/** Who uses the power: each electric machine type's draw, share of the total, and satisfaction. */
const PowerBreakdown = () => {
  const game = useAppSelector((s) => s.game);
  const rows = powerBreakdown(game);
  const { machines } = game;
  const total = rows.reduce((sum, r) => sum + r.actual, 0);
  if (rows.length === 0) return null;
  return (
    <table className="mt-3 w-full text-xs" aria-label="Power use by machine type">
      <thead className="text-left text-[11px] text-muted">
        <tr>
          <th className="pb-1 font-medium">Consumer</th>
          <th className="pb-1 text-right font-medium">Used</th>
          <th className="w-1/3 px-3 pb-1 font-medium">Share of power used</th>
          <th className="pb-1 text-right font-medium">Demanded</th>
          <th className="pb-1 text-right font-medium">Satisfied</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {rows.map(({ id, actual, demanded }) => {
          const satisfied = demanded > 0 ? Math.min(1, actual / demanded) : 1;
          const short = satisfied < 0.999;
          return (
            <tr key={id} className="border-t border-line">
              <td className="py-1 font-sans">
                <span className="flex items-center gap-1.5">
                  <ItemIcon id={id} />
                  {MACHINES[id].name} <span className="text-muted">×{runningCount(machines[id])}</span>
                </span>
              </td>
              <td className="py-1 text-right">{formatPower(actual)}</td>
              <td className="px-3 py-1">
                <ProgressBar value={total > 0 ? actual / total : 0} label={`${MACHINES[id].name} share of power used`} tone="neutral" />
              </td>
              <td className="py-1 text-right text-muted">{formatPower(demanded)}</td>
              <td className={`py-1 text-right ${short ? "text-bad" : "text-good"}`}>{formatPercent(satisfied)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

/** Supply vs demand for each flow in the power chain. */
const PowerSummary = () => {
  const flows = useAppSelector((s) => s.game.report.flows);
  const fromAccumulators = useAppSelector((s) => Math.max(0, -s.game.report.power.accumulatorFlow));
  return (
    <Panel aria-labelledby="power-summary">
      <h3 id="power-summary" className="mb-2 font-semibold">
        Power grid
      </h3>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
        {FLOWS.map((id) => {
          const { produced, capacity, demand } = flows[id];
          const stored = id === "electricity" ? fromAccumulators : 0;
          const short = demand > capacity + stored + 1e-6;
          return (
            <div key={id} className="contents">
              <dt className="flex items-center gap-1.5 text-muted">
                <ResourceIcon id={id} />
                {resourceName(id)}
              </dt>
              <dd className="flex flex-col gap-1">
                <span className="font-mono text-xs">
                  {formatRate(id, produced)} used · {formatRate(id, capacity)}{" "}
                  capacity ·{" "}
                  <span className={short ? "text-bad" : ""}>
                    {formatRate(id, demand)} demanded
                  </span>
                  {stored > 0 && <span className="text-warn"> · {formatPower(stored)} from accumulators</span>}
                </span>
                <ProgressBar
                  value={capacity > 0 ? produced / capacity : 0}
                  label={`${resourceName(id)} capacity used`}
                  tone={short ? "bad" : "good"}
                />
              </dd>
            </div>
          );
        })}
      </dl>
      <PowerBreakdown />
    </Panel>
  );
};

export { PowerSummary };
