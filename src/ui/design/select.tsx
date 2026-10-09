import { Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";
import type { ResourceId } from "../../engine/catalog";
import { ResourceIcon } from "./resource-icon";

interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: ResourceId;
}

interface SelectProps<T extends string> {
  /** Accessible name of the control. */
  label: string;
  value: T | undefined;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}

/** Dropdown whose trigger always shows the chosen option with its icon. */
const Select = <T extends string>({ label, value, options, onChange, placeholder = "Nothing available", className = "" }: SelectProps<T>) => (
  <RadixSelect.Root value={value ?? ""} onValueChange={(v) => onChange(v as T)} disabled={options.length === 0}>
    <RadixSelect.Trigger
      aria-label={label}
      className={`inline-flex h-8 min-w-40 items-center gap-2 rounded-md border border-line bg-panel px-2 text-xs hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 data-placeholder:text-muted ${className}`}
    >
      <RadixSelect.Value placeholder={placeholder} />
      <RadixSelect.Icon className="ml-auto text-muted">
        <ChevronDown size={14} />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
    <RadixSelect.Portal>
      <RadixSelect.Content
        position="popper"
        sideOffset={4}
        collisionPadding={8}
        className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line-strong bg-raised shadow-xl"
      >
        <RadixSelect.Viewport className="p-1">
          {options.map((option) => (
            <RadixSelect.Item
              key={option.value}
              value={option.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs outline-none select-none data-highlighted:bg-line-strong"
            >
              <RadixSelect.ItemText>
                <span className="flex items-center gap-2">
                  {option.icon && <ResourceIcon id={option.icon} />}
                  {option.label}
                </span>
              </RadixSelect.ItemText>
              <RadixSelect.ItemIndicator className="ml-auto">
                <Check size={12} />
              </RadixSelect.ItemIndicator>
            </RadixSelect.Item>
          ))}
        </RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  </RadixSelect.Root>
);

export { Select };
export type { SelectOption };
