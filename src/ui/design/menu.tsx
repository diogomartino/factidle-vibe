import { DropdownMenu } from "radix-ui";
import { Fragment } from "react";
import type { ReactElement, ReactNode } from "react";

interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Destructive action, shown in the error color. */
  danger?: boolean;
  /** Draw a divider above this item. */
  separatorBefore?: boolean;
  /** Muted text on the right, e.g. why an item is disabled. */
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  trigger: ReactElement;
  items: MenuItem[];
  label?: string;
  /** Lets callers build expensive items only while the menu is open. */
  onOpenChange?: (open: boolean) => void;
}

/** Dropdown list of actions anchored to its trigger; arrow keys and typeahead built in. */
const Menu = ({ trigger, items, label, onOpenChange }: MenuProps) => (
  // Non-modal so actions can open dialogs without fighting over focus and pointer locks.
  <DropdownMenu.Root modal={false} onOpenChange={onOpenChange}>
    <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        collisionPadding={8}
        className="z-50 min-w-44 rounded-md border border-line-strong bg-raised p-1 text-text shadow-xl"
      >
        {label && <DropdownMenu.Label className="px-2 py-1 text-[11px] text-muted">{label}</DropdownMenu.Label>}
        {items.map((item) => (
          <Fragment key={item.key}>
            {item.separatorBefore && <DropdownMenu.Separator className="my-1 h-px bg-line" />}
            <DropdownMenu.Item
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 ${
                item.danger ? "text-bad data-highlighted:bg-bad/15" : "data-highlighted:bg-line-strong"
              }`}
            >
              {item.icon}
              {item.label}
              {item.hint && <span className="ml-auto max-w-48 truncate pl-3 text-[11px] text-muted">{item.hint}</span>}
            </DropdownMenu.Item>
          </Fragment>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export { Menu };
export type { MenuItem };
