import { Minus, Plus } from "lucide-react";
import { IconButton } from "./button";

interface StepperProps {
  /** Accessible name, e.g. "Assemblers making gears". */
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

/** Compact − value + control for small whole numbers. */
const Stepper = ({ label, value, min = 0, max, onChange }: StepperProps) => (
  <span role="group" aria-label={label} className="inline-flex items-center rounded-md border border-line">
    <IconButton label={`Fewer: ${label}`} icon={<Minus size={12} />} className="size-6!" disabled={value <= min} onClick={() => onChange(value - 1)} />
    <span aria-live="polite" className="w-7 text-center font-mono text-xs tabular-nums">
      {value}
    </span>
    <IconButton label={`More: ${label}`} icon={<Plus size={12} />} className="size-6!" disabled={value >= max} onClick={() => onChange(value + 1)} />
  </span>
);

export { Stepper };
