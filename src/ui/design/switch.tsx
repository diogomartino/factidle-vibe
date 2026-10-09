import { Switch as RadixSwitch } from "radix-ui";
import { Tooltip } from "./tooltip";

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** On/off switch; the label is its accessible name and tooltip. */
const Switch = ({ label, checked, onChange }: SwitchProps) => (
  <Tooltip content={label}>
    <RadixSwitch.Root
      aria-label={label}
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-5 w-9 shrink-0 rounded-full border border-line-strong bg-line transition-colors data-[state=checked]:border-good/50 data-[state=checked]:bg-good/30"
    >
      <RadixSwitch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-good" />
    </RadixSwitch.Root>
  </Tooltip>
);

export { Switch };
