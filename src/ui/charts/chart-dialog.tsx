import { useState } from "react";
import type { ResourceId } from "../../engine/catalog";
import type { StatTierId } from "../../engine/types";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { chartOpened } from "../../store/ui-slice";
import { Dialog } from "../design/dialog";
import type { ChartSelection } from "../stats-utils";
import { ProductionAnalysis } from "./production-analysis";

const DialogContent = ({ initial }: { initial: ResourceId }) => {
  const [selection, setSelection] = useState<ChartSelection[]>([{ id: initial, slot: 0 }]);
  const [tier, setTier] = useState<StatTierId>("10m");
  return <ProductionAnalysis selection={selection} onSelectionChange={setSelection} tier={tier} onTierChange={setTier} height={300} />;
};

/** Opened from a sidebar sparkline for a closer look; more resources can be added. */
const ChartDialog = () => {
  const dispatch = useAppDispatch();
  const id = useAppSelector((s) => s.ui.chartResource);
  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && dispatch(chartOpened(null))} title="Production statistics" className="w-[min(94vw,1200px)]">
      {/* Keyed so each sparkline click starts from that resource. */}
      {id && <DialogContent key={id} initial={id} />}
    </Dialog>
  );
};

export { ChartDialog };
