import { Progress } from "radix-ui";
import type { Tone } from "./chip";

const FILLS: Record<Tone, string> = {
  neutral: "bg-text",
  strong: "bg-text",
  good: "bg-good",
  bad: "bg-bad",
  warn: "bg-warn",
};

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  label: string;
  tone?: Tone;
  className?: string;
}

const ProgressBar = ({ value, label, tone = "neutral", className = "" }: ProgressBarProps) => {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <Progress.Root value={percent} aria-label={label} className={`h-1 overflow-hidden rounded bg-line ${className}`}>
      <Progress.Indicator className={`h-full ${FILLS[tone]} transition-[width] duration-100`} style={{ width: `${percent}%` }} />
    </Progress.Root>
  );
};

export { ProgressBar };
