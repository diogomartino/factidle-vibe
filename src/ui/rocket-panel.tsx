import { Rocket } from "lucide-react";
import { ROCKET_PARTS } from "../engine/production";
import { useAppSelector } from "../store/store";
import { Panel } from "./design/panel";
import { ProgressBar } from "./design/progress-bar";

/** Rocket assembly progress and launches so far. */
const RocketPanel = () => {
  const parts = useAppSelector((s) => Math.floor(s.game.inventory["rocket-part"]));
  const launches = useAppSelector((s) => s.game.rocket.launches);
  return (
    <Panel aria-labelledby="rocket-panel">
      <h3 id="rocket-panel" className="flex items-center gap-2 font-semibold">
        <Rocket size={16} aria-hidden /> Rocket
      </h3>
      <p className="mt-1 text-xs text-muted">
        Each rocket needs {ROCKET_PARTS} parts, made by the silo from processing units, low density structures and rocket fuel. It launches by
        itself when complete. Launch one to win the game.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <ProgressBar value={parts / ROCKET_PARTS} label="Rocket parts built" tone="good" className="h-2 flex-1" />
        <span className="font-mono text-xs">
          {parts} / {ROCKET_PARTS} parts
        </span>
      </div>
      <p className="mt-2 text-xs">
        Rockets launched: <span className="font-mono">{launches}</span>
      </p>
    </Panel>
  );
};

export { RocketPanel };
