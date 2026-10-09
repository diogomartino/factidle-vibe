import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ReactNode } from "react";

/** Titled section that can be folded away; open by default. */
const CollapsibleSection = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
  <Collapsible.Root defaultOpen className="group">
    <Collapsible.Trigger className="flex w-full items-center justify-between rounded px-2 py-1.5 font-semibold hover:bg-raised">
      {title}
      <ChevronDown size={14} aria-hidden className="text-muted transition-transform group-data-[state=open]:rotate-180" />
    </Collapsible.Trigger>
    <Collapsible.Content>{children}</Collapsible.Content>
  </Collapsible.Root>
);

export { CollapsibleSection };
