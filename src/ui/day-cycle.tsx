import { Moon, Sun } from "lucide-react";
import { DAWN, dayTime, DUSK, EVENING, MORNING } from "../engine/daylight";
import { useAppSelector } from "../store/store";
import { Tooltip } from "./design/tooltip";
import { formatPercent } from "./format-utils";

const DAY = "var(--color-warn)";
const NIGHT = "#1e2a4a";

/** The day's brightness curve, starting at noon, as a gradient. */
const GRADIENT = `linear-gradient(to right, ${DAY} 0%, ${DAY} ${DUSK * 100}%, ${NIGHT} ${EVENING * 100}%, ${NIGHT} ${MORNING * 100}%, ${DAY} ${DAWN * 100}%, ${DAY} 100%)`;

/** Where we are in the day/night cycle, drawn as the day's light curve with a marker; no text. */
const DayCycle = () => {
  const time = useAppSelector((s) => dayTime(s.game.tick));
  const light = useAppSelector((s) => s.game.report.power.daylight);
  const label = `${light > 0.5 ? "Day" : "Night"}: solar panels at ${formatPercent(light)}`;
  return (
    <Tooltip content={label}>
      <span role="img" aria-label={label} tabIndex={0} className="flex items-center gap-1.5">
        {light > 0.5 ? <Sun size={14} className="text-warn" aria-hidden /> : <Moon size={14} className="text-muted" aria-hidden />}
        <span className="relative h-2 w-16 rounded-full opacity-80" style={{ background: GRADIENT }}>
          <span className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-text shadow" style={{ left: `${time * 100}%` }} />
        </span>
      </span>
    </Tooltip>
  );
};

export { DayCycle };
