import { Rocket } from "lucide-react";
import { ITEM_IDS, TICK_SECONDS } from "../engine/catalog";
import { victoryAcknowledged } from "../store/game-slice";
import { store, useAppDispatch, useAppSelector } from "../store/store";
import { Button } from "./design/button";
import { Dialog } from "./design/dialog";
import { formatAmount, formatDuration } from "./format-utils";

/** The ending: shown once, after the first rocket launch. The game carries on afterwards. */
const VictoryDialog = () => {
  const dispatch = useAppDispatch();
  const { firstLaunchTick, acknowledged } = useAppSelector((s) => s.game.rocket);
  const open = firstLaunchTick !== null && !acknowledged;
  // Totals are read once, when the dialog shows; the dialog doesn't need to follow every tick.
  const game = open ? store.getState().game : null;
  const produced = game ? ITEM_IDS.reduce((sum, id) => sum + (game.stats.lifetime[id] ?? 0), 0) : 0;
  const close = () => dispatch(victoryAcknowledged());
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={
        <>
          <Rocket size={16} aria-hidden /> You launched a rocket!
        </>
      }
      className="w-[min(92vw,420px)]"
    >
      <p className="text-muted">The factory reached space. You win.</p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-muted">Time played</dt>
        <dd className="font-mono">{formatDuration((firstLaunchTick ?? 0) * TICK_SECONDS)}</dd>
        <dt className="text-muted">Technologies researched</dt>
        <dd className="font-mono">{game?.research.researched.length}</dd>
        <dt className="text-muted">Items produced</dt>
        <dd className="font-mono">{formatAmount(produced)}</dd>
      </dl>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={close}>
          Keep playing
        </Button>
      </div>
    </Dialog>
  );
};

export { VictoryDialog };
