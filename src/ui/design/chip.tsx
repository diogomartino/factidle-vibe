import type { HTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./tooltip";

type Tone = "neutral" | "good" | "bad" | "warn" | "strong";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-panel text-text",
  strong: "border-line-strong bg-raised font-semibold text-text",
  good: "border-good/30 bg-good/10 text-good",
  bad: "border-bad/30 bg-bad/10 text-bad",
  warn: "border-warn/30 bg-warn/10 text-warn",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Tooltip text; also makes the chip focusable so keyboard users can read it. */
  tip?: ReactNode;
}

/** Small bordered pill for counts, rates and statuses. */
const Chip = ({ tone = "neutral", tip, className = "", ...props }: ChipProps) => {
  const chip = (
    <span
      tabIndex={tip ? 0 : undefined}
      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-xs whitespace-nowrap tabular-nums ${TONES[tone]} ${className}`}
      {...props}
    />
  );
  return tip ? <Tooltip content={tip}>{chip}</Tooltip> : chip;
};

export { Chip };
export type { Tone };
