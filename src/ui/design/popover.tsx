import { Popover as RadixPopover } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

interface PopoverProps {
  /** Toggles the popover on click. */
  trigger?: ReactElement;
  /** Positions a controlled popover without toggling it (e.g. opened from a menu). */
  anchor?: ReactElement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Stay open when clicking elsewhere (tool panels). */
  persistent?: boolean;
}

/** Non-modal floating panel anchored to its trigger. */
const Popover = ({ trigger, anchor, children, open, onOpenChange, className = "w-72", persistent = false }: PopoverProps) => (
  <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
    {trigger && <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>}
    {anchor && <RadixPopover.Anchor asChild>{anchor}</RadixPopover.Anchor>}
    <RadixPopover.Portal>
      <RadixPopover.Content
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onInteractOutside={(e) => persistent && e.preventDefault()}
        // Focus the panel, not its first control, so that control's tooltip doesn't pop up.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className={`z-40 rounded-lg outline-none border border-line-strong bg-panel p-3 text-text shadow-2xl ${className}`}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  </RadixPopover.Root>
);

export { Popover };
