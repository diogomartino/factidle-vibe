import { ScrollArea as RadixScrollArea } from "radix-ui";
import type { ReactNode } from "react";

const SCROLLBAR = "flex touch-none p-0.5 select-none data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:w-2";

/** Scroll container with thin themed scrollbars. */
const ScrollArea = ({ children, className = "", horizontal = false }: { children: ReactNode; className?: string; horizontal?: boolean }) => (
  <RadixScrollArea.Root type="hover" className={`overflow-hidden ${className}`}>
    {/* Radix wraps content in a `display: table` div that grows to fit it; vertical areas need it to keep the
        container's width so long text can truncate. */}
    <RadixScrollArea.Viewport className={`size-full ${horizontal ? "" : "[&>div]:block!"}`}>{children}</RadixScrollArea.Viewport>
    <RadixScrollArea.Scrollbar orientation={horizontal ? "horizontal" : "vertical"} className={SCROLLBAR}>
      <RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-line-strong" />
    </RadixScrollArea.Scrollbar>
  </RadixScrollArea.Root>
);

export { ScrollArea };
