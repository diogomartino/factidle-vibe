import { useEffect } from "react";
import type { GameState } from "../engine/types";
import { ticked } from "../store/game-slice";
import { startAppListening } from "../store/store";
import { mutedToggled, noticeShown } from "../store/ui-slice";
import { playSound, saveMuted } from "./sound";

const rootJobIds = (game: GameState) => game.queue.filter((j) => j.parent === null).map((j) => j.id);

const powerShort = (game: GameState) =>
  game.report.units.some((u) => u.limit?.side === "input" && u.limit.resource === "electricity");

/** Plays sounds for events that may need attention, by comparing state across each tick. */
const useSoundEffects = () => {
  useEffect(() => {
    const unsubscribers = [
      startAppListening({
        actionCreator: ticked,
        effect: (_action, api) => {
          if (api.getState().ui.muted) return;
          const before = api.getOriginalState().game;
          const after = api.getState().game;
          // Research also covers unlocks: every unlock comes from a technology.
          if (after.rocket.launches > before.rocket.launches) playSound("launch");
          else if (after.research.researched.length > before.research.researched.length) playSound("research");
          else if (rootJobIds(before).some((id) => !after.queue.some((j) => j.id === id))) playSound("craft");
          if (!powerShort(before) && powerShort(after)) playSound("warning");
        },
      }),
      startAppListening({
        actionCreator: noticeShown,
        effect: (action, api) => {
          if (action.payload.kind === "error" && !api.getState().ui.muted) playSound("error");
        },
      }),
      startAppListening({
        actionCreator: mutedToggled,
        effect: (_action, api) => saveMuted(api.getState().ui.muted),
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);
};

export { useSoundEffects };
