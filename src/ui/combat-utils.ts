import { MACHINES, RESOURCES } from "../engine/catalog";
import type { MachineId, ResourceId } from "../engine/catalog";
import { biterMix } from "../engine/combat";
import type { BiterId } from "../engine/combat";
import type { GameState } from "../engine/types";

/** How long a destroyed building stays flagged on its card and in the top bar: 60 s. */
const RECENT_LOSS_TICKS = 600;

/**
 * - `calm`: the land absorbs all pollution.
 * - `polluting`: more pollution than the land absorbs; the cloud drifts towards the nests.
 * - `clearing`: back under the line; the land is clearing what's left of the cloud.
 * - `holding`: biters attack, turrets kill them all.
 * - `breached`: biters get through and damage the base.
 */
type CombatStatus = "peaceful" | "calm" | "polluting" | "clearing" | "holding" | "breached";

const combatStatus = (game: GameState): CombatStatus => {
  const { combat } = game.report;
  if (game.combat.peaceful) return "peaceful";
  if (combat.damagePerSecond > 1e-6) return "breached";
  if (combat.bitersPerSecond > 1e-6) return "holding";
  if (combat.emitted > combat.landAbsorption) return "polluting";
  return game.combat.pollution > 0 ? "clearing" : "calm";
};

const STATUS_TEXT: Record<CombatStatus, string> = {
  peaceful: "Peaceful mode: biters never attack.",
  calm: "The land absorbs all your pollution. Biters haven't noticed you.",
  polluting: "You pollute more than the land absorbs: the cloud is drifting towards the biter nests. Attacks start when it reaches them.",
  clearing: "You're back under what the land absorbs, so biters leave you alone while the cloud clears.",
  holding: "Under attack. The turrets are killing every biter.",
  breached: "Under attack! Biters are getting through and damaging the base.",
};

/** Ammo turrets are waiting for (starved), as a joined string for cheap selectors. */
const starvedAmmo = (game: GameState) =>
  [
    ...new Set(
      game.report.units
        .filter((u) => MACHINES[u.machine].tab === "military" && u.limit?.side === "input")
        .map((u) => u.limit!.resource),
    ),
  ].join(",");

/** The building biters destroyed in the last minute, if any. */
const recentLoss = (game: GameState): MachineId | null => {
  const loss = game.combat.lastLoss;
  return loss && game.tick - loss.tick < RECENT_LOSS_TICKS ? loss.machine : null;
};

const biterIcon = (id: BiterId) => `https://wiki.factorio.com/images/${id.charAt(0).toUpperCase()}${id.slice(1).replace("-", "_")}.png`;

/** Attacking biter types with their share, biggest share first; types under 1% left out. */
const visibleMix = (evolution: number) =>
  biterMix(evolution)
    .filter((m) => m.share >= 0.01)
    .map((m) => ({ id: m.biter.id, name: m.biter.name, share: m.share }));

const resourceList = (joined: string) => (joined ? (joined.split(",") as ResourceId[]) : []);

const resourceNames = (ids: ResourceId[]) => ids.map((id) => RESOURCES[id].name.toLowerCase()).join(", ");

export { biterIcon, combatStatus, RECENT_LOSS_TICKS, recentLoss, resourceList, resourceNames, starvedAmmo, STATUS_TEXT, visibleMix };
export type { CombatStatus };
