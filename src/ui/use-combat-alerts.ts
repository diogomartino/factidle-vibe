import { useEffect } from "react";
import { MACHINE_IDS, MACHINES } from "../engine/catalog";
import type { GameState } from "../engine/types";
import { ticked } from "../store/game-slice";
import { startAppListening } from "../store/store";
import { noticeShown } from "../store/ui-slice";
import { combatStatus } from "./combat-utils";
import { playSound } from "./sound";

/** Ticks (10 s) between "building destroyed" notices, so a collapsing base doesn't flood the toasts. */
const LOSS_NOTICE_GAP_TICKS = 100;

const totalLosses = (game: GameState) => MACHINE_IDS.reduce((sum, id) => sum + (game.combat.losses[id] ?? 0), 0);

/** Notices and sounds for combat events: the first attack, a breach, and destroyed buildings. */
const useCombatAlerts = () => {
  useEffect(() => {
    let lastLossNotice = -Infinity;
    return startAppListening({
      actionCreator: ticked,
      effect: (_action, api) => {
        const before = api.getOriginalState().game;
        const after = api.getState().game;
        const { muted } = api.getState().ui;
        const notify = (text: string, kind: "info" | "error" = "error") => api.dispatch(noticeShown({ kind, text }));

        if (before.report.combat.bitersPerSecond === 0 && after.report.combat.bitersPerSecond > 0) {
          const defended = after.machines["gun-turret"].count + after.machines["laser-turret"].count > 0;
          notify(
            defended
              ? "Biters are attacking your factory."
              : "Biters are attacking and you have no turrets! Shoot them on the Military tab's radar (uses firearm magazines), or cut pollution below what the land absorbs.",
          );
        }
        if (combatStatus(before) !== "breached" && combatStatus(after) === "breached" && !muted) playSound("warning");

        const lost = totalLosses(after) - totalLosses(before);
        if (lost > 0 && after.combat.lastLoss) {
          if (!muted) playSound("destroyed");
          if (after.tick - lastLossNotice >= LOSS_NOTICE_GAP_TICKS) {
            lastLossNotice = after.tick;
            notify(`Biters destroyed a ${MACHINES[after.combat.lastLoss.machine].name.toLowerCase()}.`);
          }
        }
      },
    });
  }, []);
};

export { useCombatAlerts };
