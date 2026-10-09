import type { HTMLAttributes, ReactNode } from "react";

const Panel = ({ className = "", ...props }: HTMLAttributes<HTMLElement>) => (
  <section className={`rounded-lg border border-line bg-panel p-3 ${className}`} {...props} />
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-muted">{children}</p>
);

export { EmptyState, Panel };
