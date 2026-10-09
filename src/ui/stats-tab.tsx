import { useMemo, useState } from "react";
import { RESOURCES } from "../engine/catalog";
import type { ResourceId } from "../engine/catalog";
import type { StatTierId } from "../engine/types";
import { useAppSelector } from "../store/store";
import { ProductionAnalysis } from "./charts/production-analysis";
import { Panel } from "./design/panel";
import { ResourceIcon } from "./design/resource-icon";
import { Tooltip } from "./design/tooltip";
import { formatQuantity, formatRate } from "./format-utils";
import { CHARTABLE, tierById, toggleInSelection, windowTotals } from "./stats-utils";
import type { ChartSelection } from "./stats-utils";

/**
 * One resource's totals. Window totals only change when the tier takes a sample, and the
 * lifetime cells select formatted text, so a row re-renders only when what it shows changes.
 */
const StatsRow = ({ id, tier, charted, onToggle }: { id: ResourceId; tier: StatTierId; charted: boolean; onToggle: () => void }) => {
  const history = useAppSelector((s) => s.game.stats.tiers[tier].history);
  const produced = useAppSelector((s) => formatQuantity(id, s.game.stats.lifetime[id] ?? 0));
  const consumed = useAppSelector((s) => formatQuantity(id, s.game.stats.lifetimeConsumed[id] ?? 0));
  const { net, producedTotal, consumedTotal } = useMemo(() => windowTotals(tierById(tier), history, id), [tier, history, id]);
  return (
    <tr className={charted ? "bg-raised" : "hover:bg-raised"}>
      <td className="py-1 font-sans">
        <Tooltip content={charted ? "Remove from chart" : "Add to chart"} side="right">
          <button type="button" aria-pressed={charted} className="flex items-center gap-1.5 hover:underline" onClick={onToggle}>
            <ResourceIcon id={id} size={14} />
            {RESOURCES[id].name}
          </button>
        </Tooltip>
      </td>
      <td className="py-1 text-right">{formatQuantity(id, producedTotal)}</td>
      <td className="py-1 text-right">{formatQuantity(id, consumedTotal)}</td>
      <td className={`py-1 text-right ${net > 1e-6 ? "text-good" : net < -1e-6 ? "text-bad" : "text-muted"}`}>{formatRate(id, net, true)}</td>
      <td className="py-1 text-right">{produced}</td>
      <td className="py-1 text-right">{consumed}</td>
    </tr>
  );
};

const StatsTab = () => {
  const [selection, setSelection] = useState<ChartSelection[]>([
    { id: "iron-plate", slot: 0 },
    { id: "copper-plate", slot: 1 },
  ]);
  const [tier, setTier] = useState<StatTierId>("10m");
  const def = tierById(tier);

  return (
    <>
      <Panel aria-label="Production chart">
        <ProductionAnalysis selection={selection} onSelectionChange={setSelection} tier={tier} onTierChange={setTier} />
      </Panel>
      <Panel aria-labelledby="stats-table">
        <h3 id="stats-table" className="mb-2 font-semibold">
          Production totals
        </h3>
        <table className="w-full text-xs">
          <thead className="text-left text-muted">
            <tr>
              <th />
              <th colSpan={3} className="border-b border-line pb-1 text-center font-medium">
                Last {def.label}
              </th>
              <th colSpan={2} className="border-b border-line pb-1 text-center font-medium">
                All time
              </th>
            </tr>
            <tr>
              <th className="py-1 font-medium">Resource</th>
              <th className="py-1 text-right font-medium">Produced</th>
              <th className="py-1 text-right font-medium">Consumed</th>
              <th className="py-1 text-right font-medium">Net rate</th>
              <th className="py-1 text-right font-medium">Produced</th>
              <th className="py-1 text-right font-medium">Consumed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono">
            {CHARTABLE.map((id) => (
              <StatsRow
                key={id}
                id={id}
                tier={tier}
                charted={selection.some((c) => c.id === id)}
                onToggle={() => setSelection((current) => toggleInSelection(current, id))}
              />
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
};

export { StatsTab };
