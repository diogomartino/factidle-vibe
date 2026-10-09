import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { MANUAL_MINING_RATE, ORE_FIELD_ICON, ORE_IDS, RESOURCES } from "../engine/catalog";
import type { OreId } from "../engine/catalog";
import { techBonus } from "../engine/research";
import { capacityOf } from "../engine/inventory";
import { mined } from "../store/game-slice";
import { store, useAppDispatch, useAppSelector } from "../store/store";
import type { GameState } from "../engine/types";
import { formatAmount } from "./format-utils";

/** Minimum gap between separate clicks, so auto-clickers can't outpace holding by much. */
const CLICK_INTERVAL_MS = 100;
const HOLD_INTERVAL_MS = 1000 / MANUAL_MINING_RATE;
const FLOAT_MS = 800;

const isFull = (game: GameState, ore: OreId) => game.inventory[ore] >= capacityOf(game, ore);

const OreTile = ({ ore }: { ore: OreId }) => {
  const dispatch = useAppDispatch();
  const amount = useAppSelector((s) => s.game.inventory[ore]);
  const full = useAppSelector((s) => isFull(s.game, ore));
  // The steel axe doubles what each mining action yields.
  const perAction = useAppSelector((s) => 1 + techBonus(s.game, "manualMining"));
  const [floats, setFloats] = useState<number[]>([]);
  const lastMined = useRef(0);
  const holdTimer = useRef<number | undefined>(undefined);
  const nextFloat = useRef(0);

  const mineOnce = (minGap: number) => {
    const now = performance.now();
    if (now - lastMined.current < minGap || isFull(store.getState().game, ore)) return;
    lastMined.current = now;
    dispatch(mined({ ore, amount: perAction }));
    const id = nextFloat.current++;
    setFloats((f) => [...f, id]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x !== id)), FLOAT_MS);
  };

  const stopHold = () => window.clearInterval(holdTimer.current);
  useEffect(() => () => window.clearInterval(holdTimer.current), []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    mineOnce(e.repeat ? HOLD_INTERVAL_MS : CLICK_INTERVAL_MS);
  };

  const name = RESOURCES[ore].name;
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={`Mine ${name.toLowerCase()}${full ? " (storage full)" : ""}. Hold to keep mining.`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          mineOnce(CLICK_INTERVAL_MS);
          stopHold();
          holdTimer.current = window.setInterval(() => mineOnce(0), HOLD_INTERVAL_MS);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onLostPointerCapture={stopHold}
        onKeyDown={onKeyDown}
        className="relative size-28 touch-none rounded-lg border border-line bg-cover bg-center shadow-inner transition select-none hover:brightness-125 active:scale-95"
        style={{ backgroundImage: `url(${ORE_FIELD_ICON[ore]})` }}
      >
        {full && <span className="absolute inset-x-0 bottom-1 text-center text-xs font-semibold text-warn drop-shadow">Full</span>}
        {floats.map((id) => (
          <span
            key={id}
            aria-hidden
            className="animate-float-up pointer-events-none absolute top-1/3 left-1/2 font-mono text-sm font-bold text-white drop-shadow-[0_1px_2px_black]"
          >
            +{perAction}
          </span>
        ))}
      </button>
      <span className="text-xs text-muted">
        {name} · <span className="font-mono text-text">{formatAmount(amount)}</span>
      </span>
    </div>
  );
};

const ManualMining = () => (
  <div className="flex flex-wrap gap-3" role="group" aria-label="Manual mining">
    {ORE_IDS.map((ore) => (
      <OreTile key={ore} ore={ore} />
    ))}
  </div>
);

export { ManualMining };
