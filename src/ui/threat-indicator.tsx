import { Bug, X } from "lucide-react";
import { shallowEqual } from "react-redux";
import { nestReach } from "../engine/combat";
import type { GameState } from "../engine/types";
import { useAppDispatch, useAppSelector } from "../store/store";
import { tabSelected } from "../store/ui-slice";
import { combatStatus, recentLoss, resourceList, resourceNames, starvedAmmo, STATUS_TEXT } from "./combat-utils";
import type { CombatStatus } from "./combat-utils";
import { ResourceIcon } from "./design/resource-icon";
import { Tooltip } from "./design/tooltip";
import { formatPercent, resourceName } from "./format-utils";

const ICON_TONE: Record<CombatStatus, string> = {
  peaceful: "text-muted",
  calm: "text-muted",
  polluting: "text-warn",
  clearing: "text-muted",
  holding: "text-warn",
  breached: "text-bad animate-pulse",
};

const threatDisplay = (game: GameState) => {
  const report = game.report.combat;
  return {
    status: combatStatus(game),
    // How far the cloud has drifted towards the nests; full means attacks.
    reach: Math.round(nestReach(game) * 40) / 40,
    emitted: Math.round(report.emitted * 60),
    absorbed: Math.round(report.landAbsorption * 60),
    evolution: formatPercent(game.combat.evolution),
    starved: starvedAmmo(game),
    lost: recentLoss(game) ?? ("" as const),
  };
};

/**
 * Factorio-style threat and alerts in the top bar: a bug colored by how the defense is doing, a
 * meter of pollution against what the land absorbs, and alert icons for turrets out of ammo and
 * buildings destroyed. All of them open the Military tab.
 */
const ThreatIndicator = () => {
  const dispatch = useAppDispatch();
  const d = useAppSelector((s) => threatDisplay(s.game), shallowEqual);
  const open = () => dispatch(tabSelected("military"));
  const starved = resourceList(d.starved);
  return (
    <span className="flex items-center gap-1">
      <Tooltip
        content={`${STATUS_TEXT[d.status]} Pollution ${d.emitted}/min, the land absorbs ${d.absorbed}/min. The cloud is ${formatPercent(d.reach)} of the way to the nests. Evolution ${d.evolution}. Click to open the Military tab.`}
      >
        <button type="button" onClick={open} aria-label={`Threat: ${STATUS_TEXT[d.status]}`} className="flex h-8 items-center gap-1.5 rounded-md px-1.5 hover:bg-raised">
          <Bug size={15} className={ICON_TONE[d.status]} aria-hidden />
          <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-line">
            <span
              className={`absolute inset-y-0 left-0 transition-[width] ${d.reach >= 1 ? "bg-bad" : d.reach > 0.5 ? "bg-warn" : "bg-muted"}`}
              style={{ width: `${d.reach * 100}%` }}
            />
          </span>
        </button>
      </Tooltip>
      {starved.length > 0 && (
        <Tooltip content={`Turrets are out of ${resourceNames(starved)}. Click to open the Military tab.`}>
          <button type="button" onClick={open} aria-label={`Alert: turrets out of ${resourceNames(starved)}`} className="relative flex size-8 items-center justify-center rounded-md hover:bg-raised">
            <ResourceIcon id={starved[0]!} size={18} />
            <span className="absolute inset-1 animate-pulse rounded border-2 border-bad" aria-hidden />
          </button>
        </Tooltip>
      )}
      {d.lost && (
        <Tooltip content={`Biters destroyed a ${resourceName(d.lost).toLowerCase()}. Click to open the Military tab.`}>
          <button type="button" onClick={open} aria-label={`Alert: ${resourceName(d.lost)} destroyed`} className="relative flex size-8 items-center justify-center rounded-md hover:bg-raised">
            <ResourceIcon id={d.lost} size={18} />
            <X size={18} strokeWidth={3} className="absolute text-bad" aria-hidden />
          </button>
        </Tooltip>
      )}
    </span>
  );
};

/** A red pulse on the screen edges while biters damage the base, whatever tab is open. */
const AttackOverlay = () => {
  const breached = useAppSelector((s) => combatStatus(s.game) === "breached");
  if (!breached) return null;
  return <div aria-hidden className="pointer-events-none fixed inset-0 z-40 animate-edge-pulse" />;
};

export { AttackOverlay, ThreatIndicator };
