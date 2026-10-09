import { useEffect, useRef } from "react";
import { MACHINES, RESOURCES } from "../engine/catalog";
import { Crosshair } from "lucide-react";
import { biterMix, handMagazine, nestReach } from "../engine/combat";
import type { BiterId } from "../engine/combat";
import type { GameState } from "../engine/types";
import { shotByHand } from "../store/game-slice";
import { store, useAppDispatch, useAppSelector } from "../store/store";
import { Button } from "./design/button";
import { ProgressBar } from "./design/progress-bar";
import { ResourceIcon } from "./design/resource-icon";
import { Tooltip } from "./design/tooltip";
import { combatStatus, starvedAmmo, STATUS_TEXT } from "./combat-utils";

/**
 * A top-down radar of the factory's perimeter. It's a picture of the simulation, not part of
 * it: biters are spawned at the real attack rate and die at the real kill share, but their
 * positions are made up. Drawn on a canvas from the store each frame, so React never re-renders.
 */

const SIZE = 280;
const CENTER = SIZE / 2;
const EDGE = 128;
const WALL = 66;
const TURRETS = 52;
const CORE = 24;
const NESTS = [0.4, 1.3, 2.2, 3.4, 4.3, 5.4];
/** Most biters drawn per second; a big attack is still readable. */
const MAX_VISIBLE_RATE = 25;

const BITER_LOOK: Record<BiterId, { size: number; speed: number; color: string }> = {
  "small-biter": { size: 2, speed: 42, color: "#c9b48a" },
  "medium-biter": { size: 2.8, speed: 34, color: "#c46a6a" },
  "big-biter": { size: 3.6, speed: 28, color: "#6c7fd6" },
  "behemoth-biter": { size: 5, speed: 22, color: "#8fd14f" },
};

interface Biter {
  angle: number;
  radius: number;
  look: (typeof BITER_LOOK)[BiterId];
  /** Dies at this radius, or leaks through to the wall or core (null). */
  deathRadius: number | null;
}

interface Effect {
  kind: "tracer" | "splat" | "hit";
  angle: number;
  radius: number;
  from?: { x: number; y: number };
  age: number;
  life: number;
}

const polar = (angle: number, radius: number) => ({ x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius });

const pickBiter = (game: GameState) => {
  let roll = Math.random();
  for (const { biter, share } of biterMix(game.combat.evolution)) {
    roll -= share;
    if (roll <= 0) return biter.id;
  }
  return "small-biter";
};

/** Theme colors, read from the CSS tokens once. */
const themeColors = () => {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--color-${name}`).trim();
  return { line: token("line"), lineStrong: token("line-strong"), panel: token("panel"), muted: token("muted"), good: token("good"), bad: token("bad"), warn: token("warn"), text: token("text") };
};

const draw = (ctx: CanvasRenderingContext2D, game: GameState, biters: Biter[], effects: Effect[], time: number, colors: ReturnType<typeof themeColors>) => {
  const report = game.report.combat;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Radar rings and a slow sweep.
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.line;
  for (const r of [EDGE / 3, (2 * EDGE) / 3, EDGE]) {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const sweep = (time * 0.5) % (Math.PI * 2);
  const gradient = ctx.createConicGradient(sweep - 0.6, CENTER, CENTER);
  gradient.addColorStop(0, "rgba(74, 222, 128, 0)");
  gradient.addColorStop(0.095, "rgba(74, 222, 128, 0.12)");
  gradient.addColorStop(0.1, "rgba(74, 222, 128, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, EDGE, 0, Math.PI * 2);
  ctx.fill();

  // The pollution cloud drifts outwards and touches the nests when attacks begin; nests glow while they feed on it.
  const cloud = nestReach(game);
  if (cloud > 0) {
    const reach = CORE + (EDGE - 6 - CORE) * cloud;
    const haze = ctx.createRadialGradient(CENTER, CENTER, CORE, CENTER, CENTER, reach);
    haze.addColorStop(0, "rgba(150, 120, 60, 0.35)");
    haze.addColorStop(1, "rgba(150, 120, 60, 0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, reach, 0, Math.PI * 2);
    ctx.fill();
  }
  const feeding = report.attackPollution > 0;
  for (const angle of NESTS) {
    const { x, y } = polar(angle, EDGE - 6);
    const glow = feeding ? 0.5 + 0.5 * Math.sin(time * 3 + angle) : 0;
    ctx.fillStyle = `rgba(190, 60, 60, ${0.35 + 0.4 * glow})`;
    for (const [dx, dy, r] of [[0, 0, 5], [5, 3, 3.5], [-4, 4, 3]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Walls: a ring colored by their health.
  const walls = game.machines["stone-wall"].count;
  if (walls > 0) {
    const health = 1 - game.combat.wallDamage / (walls * MACHINES["stone-wall"].health);
    ctx.strokeStyle = health > 0.5 ? colors.muted : colors.warn;
    ctx.lineWidth = Math.min(6, 2 + walls / 40);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, WALL, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Turrets around the core: amber guns (grey without ammo), cyan lasers.
  const guns = game.machines["gun-turret"].count;
  const lasers = game.machines["laser-turret"].count;
  const shown = Math.min(24, guns + lasers);
  const starved = starvedAmmo(game) !== "";
  const turretSpots: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < shown; i++) {
    const angle = (i / shown) * Math.PI * 2;
    const spot = polar(angle, TURRETS);
    turretSpots.push(spot);
    const laser = i < Math.round((lasers / (guns + lasers)) * shown);
    ctx.fillStyle = laser ? "#67e8f9" : starved ? colors.muted : colors.warn;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // The factory core: flashes red while buildings take damage.
  const breached = report.damagePerSecond > 0 && walls === 0;
  ctx.fillStyle = breached && Math.sin(time * 10) > 0 ? colors.bad : colors.panel;
  ctx.strokeStyle = colors.lineStrong;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, CORE, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  for (const biter of biters) {
    const { x, y } = polar(biter.angle, biter.radius);
    ctx.fillStyle = biter.look.color;
    ctx.beginPath();
    ctx.arc(x, y, biter.look.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const effect of effects) {
    const fade = 1 - effect.age / effect.life;
    const { x, y } = polar(effect.angle, effect.radius);
    if (effect.kind === "tracer" && effect.from) {
      ctx.strokeStyle = `rgba(253, 224, 71, ${fade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(effect.from.x, effect.from.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (effect.kind === "splat") {
      ctx.fillStyle = `rgba(132, 204, 22, ${0.5 * fade})`;
      ctx.beginPath();
      ctx.arc(x, y, 3 + 2 * (1 - fade), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(248, 113, 113, ${fade})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, effect.radius, effect.angle - 0.25, effect.angle + 0.25);
      ctx.stroke();
    }
  }
  return turretSpots;
};

/** Biters shot per hand-fired magazine on the radar: a picture, the real damage is in the engine. */
const HAND_KILLS = 3;
const HOLD_INTERVAL_MS = 250;

const PerimeterRadar = () => {
  const dispatch = useAppDispatch();
  const canvas = useRef<HTMLCanvasElement>(null);
  /** Shoots by hand, and draws the shots towards a point on the radar (or the nearest biters). */
  const shoot = useRef<(at?: { x: number; y: number }) => void>(() => {});
  const holdTimer = useRef<number | undefined>(undefined);
  const label = useAppSelector((s) => STATUS_TEXT[combatStatus(s.game)]);
  const shooting = useAppSelector((s) => s.game.report.combat.bitersPerSecond > 0);
  const magazine = useAppSelector((s) => handMagazine(s.game).item);
  const magazines = useAppSelector((s) => Math.floor(s.game.inventory[handMagazine(s.game).item]));
  const cover = useAppSelector((s) => {
    const { capacity } = handMagazine(s.game);
    return Math.round((s.game.combat.handFire / capacity) * 50) / 50;
  });

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = SIZE * ratio;
    element.height = SIZE * ratio;
    ctx.scale(ratio, ratio);
    const colors = themeColors();
    const biters: Biter[] = [];
    let effects: Effect[] = [];
    let turretSpots: Array<{ x: number; y: number }> = [];
    let spawnDebt = 0;

    shoot.current = (at) => {
      const before = store.getState().game.combat.handFire;
      dispatch(shotByHand());
      if (store.getState().game.combat.handFire <= before) return;
      const target = at ?? { x: CENTER, y: CENTER };
      const distance = (b: Biter) => Math.hypot(polar(b.angle, b.radius).x - target.x, polar(b.angle, b.radius).y - target.y);
      const victims = [...biters].sort((a, b) => distance(a) - distance(b)).slice(0, HAND_KILLS);
      const from = { x: CENTER, y: CENTER };
      if (victims.length === 0 && at) {
        const angle = Math.atan2(at.y - CENTER, at.x - CENTER);
        effects.push({ kind: "tracer", angle, radius: Math.hypot(at.x - CENTER, at.y - CENTER), from, age: 0, life: 0.15 });
      }
      for (const victim of victims) {
        effects.push({ kind: "tracer", angle: victim.angle, radius: victim.radius, from, age: 0, life: 0.2 });
        effects.push({ kind: "splat", angle: victim.angle, radius: victim.radius, age: 0, life: 1.5 });
        biters.splice(biters.indexOf(victim), 1);
      }
    };
    let last = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { game, ui } = store.getState();
      const report = game.report.combat;
      if (!ui.paused) {
        spawnDebt += Math.min(MAX_VISIBLE_RATE, report.bitersPerSecond) * dt;
        for (; spawnDebt >= 1; spawnDebt--) {
          const angle = NESTS[Math.floor(Math.random() * NESTS.length)]! + (Math.random() - 0.5) * 0.5;
          const dies = Math.random() < report.killedShare;
          biters.push({
            angle,
            radius: EDGE - 6,
            look: BITER_LOOK[pickBiter(game)],
            deathRadius: dies ? WALL + 8 + Math.random() * (EDGE - WALL - 30) : null,
          });
        }
        const target = game.machines["stone-wall"].count > 0 ? WALL + 3 : CORE + 2;
        for (let i = biters.length - 1; i >= 0; i--) {
          const biter = biters[i]!;
          biter.radius -= biter.look.speed * dt;
          if (biter.deathRadius !== null && biter.radius <= biter.deathRadius) {
            const from = turretSpots.length > 0 ? turretSpots[Math.floor(Math.random() * turretSpots.length)] : undefined;
            effects.push({ kind: "tracer", angle: biter.angle, radius: biter.radius, from, age: 0, life: 0.15 });
            effects.push({ kind: "splat", angle: biter.angle, radius: biter.radius, age: 0, life: 1.5 });
            biters.splice(i, 1);
          } else if (biter.radius <= target) {
            effects.push({ kind: "hit", angle: biter.angle, radius: target, age: 0, life: 0.6 });
            biters.splice(i, 1);
          }
        }
        for (const effect of effects) effect.age += dt;
        effects = effects.filter((e) => e.age < e.life);
      }
      turretSpots = draw(ctx, game, biters, effects, now / 1000, colors);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(holdTimer.current);
    };
  }, [dispatch]);

  const stopHold = () => window.clearInterval(holdTimer.current);
  const name = RESOURCES[magazine].name.toLowerCase();

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 self-center">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Perimeter radar. ${label}`}
        className={`touch-none rounded-full border border-line bg-bg ${shooting ? "cursor-crosshair" : ""}`}
        style={{ width: SIZE, height: SIZE }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const at = { x: ((e.clientX - rect.left) / rect.width) * SIZE, y: ((e.clientY - rect.top) / rect.height) * SIZE };
          e.currentTarget.setPointerCapture(e.pointerId);
          shoot.current(at);
          stopHold();
          holdTimer.current = window.setInterval(() => shoot.current(at), HOLD_INTERVAL_MS);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onLostPointerCapture={stopHold}
      />
      <div className="flex items-center gap-2 text-xs">
        <Tooltip content={`Click or hold on the radar to shoot. Each shot spends a ${name} and kills biters as they arrive; up to 3 magazines' worth waits ready.`}>
          <Button size="sm" aria-disabled={!shooting || magazines === 0} onClick={() => shooting && shoot.current()}>
            <Crosshair size={14} aria-hidden /> Shoot
          </Button>
        </Tooltip>
        <span className="inline-flex items-center gap-1 font-mono">
          <ResourceIcon id={magazine} size={16} />
          {magazines}
        </span>
        <ProgressBar value={cover} label="Hand-fired damage ready" tone="good" className="w-16" />
      </div>
    </div>
  );
};

export { PerimeterRadar };
