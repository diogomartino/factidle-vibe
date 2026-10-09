import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
}

/** Single-choice button group (arrow keys move between options). */
const SegmentedControl = <T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) => (
  <ToggleGroup.Root
    type="single"
    aria-label={label}
    value={value}
    onValueChange={(next) => next && onChange(next as T)}
    className="inline-flex rounded-md border border-line bg-panel p-0.5"
  >
    {options.map((option) => (
      <ToggleGroup.Item
        key={option.value}
        value={option.value}
        className="h-6 min-w-8 rounded px-2 text-xs font-medium text-muted hover:text-text data-[state=on]:bg-raised data-[state=on]:text-text data-[state=on]:ring-1 data-[state=on]:ring-line-strong"
      >
        {option.label}
      </ToggleGroup.Item>
    ))}
  </ToggleGroup.Root>
);

export { SegmentedControl };
