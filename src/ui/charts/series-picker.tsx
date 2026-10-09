import { Plus, X } from "lucide-react";
import { RESOURCES } from "../../engine/catalog";
import { Button } from "../design/button";
import { Menu } from "../design/menu";
import { ResourceIcon } from "../design/resource-icon";
import { Tooltip } from "../design/tooltip";
import { resourceName } from "../format-utils";
import { addToSelection, CHARTABLE, MAX_SERIES, removeFromSelection, unitGroup } from "../stats-utils";
import type { ChartSelection } from "../stats-utils";
import { CATEGORICAL_COLORS } from "./chart-theme";

interface SeriesPickerProps {
  selection: ChartSelection[];
  onChange: (selection: ChartSelection[]) => void;
}

/** Charted resources as removable chips (doubling as the legend), plus an "Add" menu. */
const SeriesPicker = ({ selection, onChange }: SeriesPickerProps) => {
  const group = unitGroup(selection[0]!.id);
  const options = CHARTABLE.filter((id) => !selection.some((s) => s.id === id));
  const full = selection.length >= MAX_SERIES;
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Charted resources">
      {selection.map(({ id, slot }) => (
        <span key={id} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-panel pr-0.5 pl-2 text-xs">
          <span className="h-0.5 w-3 rounded" style={{ background: CATEGORICAL_COLORS[slot] }} aria-hidden />
          <ResourceIcon id={id} size={14} />
          {resourceName(id)}
          {selection.length > 1 && (
            <Tooltip content={`Remove ${resourceName(id)}`}>
              <button
                type="button"
                aria-label={`Remove ${resourceName(id)} from the chart`}
                onClick={() => onChange(removeFromSelection(selection, id))}
                className="rounded p-0.5 text-muted hover:bg-raised hover:text-text"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </span>
      ))}
      <Menu
        label={full ? `At most ${MAX_SERIES} lines` : "Add to chart"}
        trigger={
          <Button variant="ghost" size="sm" className="text-muted hover:text-text">
            <Plus size={12} aria-hidden /> Add
          </Button>
        }
        items={options.map((id) => {
          const sameUnit = unitGroup(id) === group;
          return {
            key: id,
            label: RESOURCES[id].name,
            icon: <ResourceIcon id={id} />,
            disabled: sameUnit && full,
            hint: sameUnit ? undefined : "different unit: replaces",
            onSelect: () => onChange(addToSelection(selection, id)),
          };
        })}
      />
    </div>
  );
};

export { SeriesPicker };
