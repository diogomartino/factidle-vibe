import { Tooltip as RadixTooltip } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  /** A single element that accepts a ref and props (button, span, img…). */
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

/** Hover/focus tooltip rendered in a portal, so it never clips or shifts layout. */
const Tooltip = ({ content, children, side = "top" }: TooltipProps) => (
  <RadixTooltip.Root>
    <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        side={side}
        sideOffset={6}
        collisionPadding={8}
        className="z-50 max-w-80 rounded-md border border-line-strong bg-raised px-2 py-1 text-xs whitespace-pre-line text-text shadow-lg"
      >
        {content}
        <RadixTooltip.Arrow className="fill-line-strong" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  </RadixTooltip.Root>
);

const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <RadixTooltip.Provider delayDuration={250} skipDelayDuration={100}>
    {children}
  </RadixTooltip.Provider>
);

export { Tooltip, TooltipProvider };
