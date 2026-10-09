import { FastForward, Pause, Play, SkipForward } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import { ITEM_IDS, RESOURCES, TICKS_PER_SECOND } from "../engine/catalog";
import type { ItemId } from "../engine/catalog";
import { capacityOf } from "../engine/inventory";
import { allResearched, gameReset, itemSet, ticked } from "../store/game-slice";
import { store, useAppDispatch, useAppSelector } from "../store/store";
import { debugToggled, pauseToggled } from "../store/ui-slice";
import { Button, IconButton } from "./design/button";
import { Input } from "./design/input";
import { Popover } from "./design/popover";
import { Select } from "./design/select";

const ITEM_OPTIONS = ITEM_IDS.map((id) => ({ value: id, label: RESOURCES[id].name, icon: id }));

const DebugTools = () => {
  const dispatch = useAppDispatch();
  const { paused, tickMs } = useAppSelector((s) => s.ui);
  const tick = useAppSelector((s) => s.game.tick);
  const [item, setItem] = useState<ItemId>("coal");
  const [amount, setAmount] = useState(100);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-semibold text-accent">Debug</h2>
      <dl className="grid grid-cols-2 gap-1 font-mono text-xs">
        <dt className="text-muted">Tick</dt>
        <dd>{tick}</dd>
        <dt className="text-muted">Game time</dt>
        <dd>{(tick / TICKS_PER_SECOND).toFixed(1)}s</dd>
        <dt className="text-muted">Tick cost</dt>
        <dd>{tickMs.toFixed(3)} ms</dd>
      </dl>
      <div className="flex gap-1">
        <Button size="sm" onClick={() => dispatch(pauseToggled())}>
          {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />} {paused ? "Resume" : "Pause"}
        </Button>
        <IconButton label="Advance one tick" icon={<SkipForward size={14} />} variant="outline" onClick={() => dispatch(ticked(1))} />
        <Button size="sm" onClick={() => dispatch(ticked(60 * TICKS_PER_SECOND))}>
          <FastForward size={14} aria-hidden /> 1 min
        </Button>
      </div>
      <div className="flex gap-1">
        <Select label="Item to set" value={item} options={ITEM_OPTIONS} onChange={setItem} className="min-w-0 flex-1" />
        <Input aria-label="Amount" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-20" />
        <Button size="sm" className="h-8" onClick={() => dispatch(itemSet({ item, amount }))}>
          Set
        </Button>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => {
            const game = store.getState().game;
            for (const id of ITEM_IDS)
              if (RESOURCES[id].kind !== "building") dispatch(itemSet({ item: id, amount: capacityOf(game, id) }));
          }}
        >
          Fill all
        </Button>
        <Button size="sm" onClick={() => dispatch(allResearched())}>
          Research all
        </Button>
        <Button size="sm" variant="danger" onClick={() => dispatch(gameReset())}>
          Reset state
        </Button>
      </div>
    </div>
  );
};

/** Development-only tools: pause, step, inspect timing and edit inventory. Opened from the game menu, anchored to `children`. */
const DebugPanel = ({ children }: { children: ReactElement }) => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.debugOpen);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => dispatch(debugToggled(next))}
      anchor={children}
      className="w-80 border-accent/40"
      persistent
    >
      <DebugTools />
    </Popover>
  );
};

export { DebugPanel };
