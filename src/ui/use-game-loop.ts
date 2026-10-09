import { useEffect } from "react";
import { TICK_SECONDS } from "../engine/catalog";
import { ticked } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { tickTimed } from "../store/ui-slice";

const TICK_MS = TICK_SECONDS * 1000;
/** Time beyond this (e.g. a hidden tab) is dropped: there is no offline progress yet. */
const MAX_CATCH_UP_MS = 1000;

/** Fixed-timestep loop: real time accumulates and is spent in whole simulation ticks. */
const useGameLoop = () => {
  const dispatch = useAppDispatch();
  const paused = useAppSelector((s) => s.ui.paused);
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    let pending = 0;
    let frame = 0;
    const loop = (now: number) => {
      pending = Math.min(pending + now - last, MAX_CATCH_UP_MS);
      last = now;
      const ticks = Math.floor(pending / TICK_MS);
      if (ticks > 0) {
        pending -= ticks * TICK_MS;
        const start = performance.now();
        dispatch(ticked(ticks));
        dispatch(tickTimed((performance.now() - start) / ticks));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [dispatch, paused]);
};

export { useGameLoop };
