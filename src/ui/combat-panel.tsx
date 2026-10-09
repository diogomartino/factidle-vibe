import { Bug, Shield, Skull } from "lucide-react";
import type { ReactNode } from "react";
import { shallowEqual } from "react-redux";
import { MACHINE_IDS, MACHINES } from "../engine/catalog";
import type { MachineId } from "../engine/catalog";
import { nestReach, REPAIR_PACK_HP } from "../engine/combat";
import type { GameState } from "../engine/types";
import { peacefulToggled } from "../store/game-slice";
import { useAppDispatch, useAppSelector } from "../store/store";
import { combatStatus, STATUS_TEXT, visibleMix, biterIcon } from "./combat-utils";
import type { CombatStatus } from "./combat-utils";
import { Chip } from "./design/chip";
import type { Tone } from "./design/chip";
import { Panel } from "./design/panel";
import { ProgressBar } from "./design/progress-bar";
import { ResourceIcon } from "./design/resource-icon";
import { Switch } from "./design/switch";
import { Tooltip } from "./design/tooltip";
import { formatAmount, formatPercent } from "./format-utils";
import { PerimeterRadar } from "./perimeter-radar";

const STATUS_TONE: Record<CombatStatus, Tone> = { peaceful: "neutral", calm: "good", polluting: "warn", clearing: "neutral", holding: "warn", breached: "bad" };
const STATUS_LABEL: Record<CombatStatus, string> = {
  peaceful: "Peaceful",
  calm: "Calm",
  polluting: "Attracting biters",
  clearing: "Clearing",
  holding: "Holding",
  breached: "Breached",
};

const perMinute = (perSecond: number) => formatAmount(perSecond * 60, perSecond * 60 < 10 ? 1 : 0);

/** Everything the panel shows, as text and rounded numbers: it re-renders when the display changes. */
const combatDisplay = (game: GameState) => {
  const report = game.report.combat;
  const walls = game.machines["stone-wall"].count;
  const wallMax = walls * MACHINES["stone-wall"].health;
  return {
    status: combatStatus(game),
    peaceful: game.combat.peaceful,
    emitted: perMinute(report.emitted),
    absorbed: perMinute(report.landAbsorption),
    over: report.emitted > report.landAbsorption,
    reach: Math.round(nestReach(game) * 100) / 100,
    cloud: formatAmount(game.combat.pollution),
    evolution: formatPercent(game.combat.evolution),
    evolutionExact: (game.combat.evolution * 100).toFixed(2),
    biters: perMinute(report.bitersPerSecond),
    threat: formatAmount(report.threat, report.threat < 10 ? 1 : 0),
    firepower: formatAmount(game.report.flows.firepower.capacity, game.report.flows.firepower.capacity < 10 ? 1 : 0),
    killed: formatPercent(report.killedShare),
    damage: formatAmount(report.damagePerSecond, report.damagePerSecond < 10 ? 1 : 0),
    damaged: report.damagePerSecond > 1e-6,
    walls,
    wallHealth: wallMax > 0 ? Math.round(((wallMax - game.combat.wallDamage) / wallMax) * 100) / 100 : 0,
    repairPacks: Math.floor(game.inventory["repair-pack"]),
    kills: formatAmount(game.combat.kills),
    losses: MACHINE_IDS.filter((id) => (game.combat.losses[id] ?? 0) > 0)
      .map((id) => `${id}:${game.combat.losses[id]}`)
      .join(","),
  };
};

const Stat = ({ label, children, tip }: { label: string; children: ReactNode; tip: string }) => (
  <Tooltip content={tip}>
    <div tabIndex={0} className="flex flex-col gap-0.5 rounded-md border border-line px-2 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-xs">{children}</span>
    </div>
  </Tooltip>
);

/** Evolution and the biters it sends: icons with their share of attackers. */
const BiterMix = () => {
  const evolution = useAppSelector((s) => Math.round(s.game.combat.evolution * 1000) / 1000);
  return (
    <span className="flex items-center gap-2">
      {visibleMix(evolution).map((m) => (
        <Tooltip key={m.id} content={`${m.name}: ${formatPercent(m.share)} of attackers`}>
          <span tabIndex={0} className="inline-flex items-center gap-0.5 font-mono text-[11px]">
            <img src={biterIcon(m.id)} alt={m.name} width={18} height={18} />
            {formatPercent(m.share)}
          </span>
        </Tooltip>
      ))}
    </span>
  );
};

/** Pollution, evolution, the attack and the defense, plus the radar view. */
const CombatPanel = () => {
  const dispatch = useAppDispatch();
  const d = useAppSelector((s) => combatDisplay(s.game), shallowEqual);
  const losses = d.losses ? d.losses.split(",").map((entry) => entry.split(":") as [MachineId, string]) : [];
  return (
    <Panel aria-labelledby="combat-panel">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 id="combat-panel" className="font-semibold">
          Defense
        </h3>
        <Chip tone={STATUS_TONE[d.status]} tip={STATUS_TEXT[d.status]}>
          {d.status === "breached" ? <Skull size={13} aria-hidden /> : d.status === "holding" ? <Shield size={13} aria-hidden /> : <Bug size={13} aria-hidden />}
          {STATUS_LABEL[d.status]}
        </Chip>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted">
          Peaceful mode
          <Switch label="Peaceful mode: biters never attack" checked={d.peaceful} onChange={() => dispatch(peacefulToggled())} />
        </span>
      </div>
      <p className="mb-2 text-xs text-muted">{STATUS_TEXT[d.status]}</p>
      <div className="flex flex-col gap-3 lg:flex-row">
        <PerimeterRadar />
        <div className="grid flex-1 grid-cols-2 content-start gap-2">
          <Stat label="Pollution / min" tip="Pollution your machines emit per minute, against what the land absorbs. Above the line, the excess drifts to the biter nests.">
            <span className={d.over ? "text-warn" : ""}>{d.emitted}</span>
            <span className="text-muted">/ {d.absorbed} absorbed</span>
          </Stat>
          <Stat
            label={`Reaching the nests ${formatPercent(d.reach)}`}
            tip={`The pollution cloud (${d.cloud}) drifts towards the biter nests while you pollute more than the land absorbs. Once it reaches them, they turn it into attackers. Below the line, the land clears it and biters leave you alone.`}
          >
            <ProgressBar value={d.reach} label="Pollution cloud reaching the nests" tone={d.reach >= 1 ? "bad" : d.reach > 0.5 ? "warn" : "neutral"} className="w-24" />
            <ResourceIcon id="pollution" size={14} />
            {d.cloud}
          </Stat>
          <Stat label={`Evolution ${d.evolution}`} tip={`Evolution ${d.evolutionExact}%: rises with time and with every unit of pollution. Higher evolution sends bigger biters.`}>
            <BiterMix />
          </Stat>
          <Stat label="Attackers / min" tip="Biters arriving per minute, constantly, while the cloud reaches the nests.">
            {d.biters}
          </Stat>
          <Stat label="Biter health vs firepower" tip="Biter health arriving per second, against the most the turrets can remove per second with their ammo and the current biters.">
            {d.threat} <span className="text-muted">/ {d.firepower} HP/s</span>
          </Stat>
          <Stat label="Killed" tip={`Share of attackers the turrets kill. ${d.kills} biters killed so far.`}>
            <span className={d.status === "breached" ? "text-bad" : ""}>{d.killed}</span>
            <span className="text-muted">· {d.kills} total</span>
          </Stat>
          <Stat label="Damage taken / s" tip="Each biter that gets through bites 10 times: walls first, then the buildings polluting the most.">
            <span className={d.damaged ? "text-bad" : ""}>{d.damage}</span>
          </Stat>
          <Stat label={`Walls ×${d.walls}`} tip={`Wall health. Repair packs in storage (${d.repairPacks}) fix up to 120 HP/s, ${REPAIR_PACK_HP} HP each.`}>
            <ProgressBar value={d.wallHealth} label="Wall health" tone={d.wallHealth < 0.5 ? "bad" : "good"} className="w-16" />
            <ResourceIcon id="repair-pack" size={14} />
            {d.repairPacks}
          </Stat>
        </div>
      </div>
      {losses.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          Lost to biters:
          {losses.map(([id, n]) => (
            <span key={id} className="inline-flex items-center gap-1 text-bad">
              <ResourceIcon id={id} size={14} /> {n} {MACHINES[id].name.toLowerCase()}
            </span>
          ))}
        </p>
      )}
    </Panel>
  );
};

export { CombatPanel };
