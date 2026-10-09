import { Separator as RadixSeparator } from "radix-ui";

const Separator = ({ vertical = false, className = "" }: { vertical?: boolean; className?: string }) => (
  <RadixSeparator.Root
    orientation={vertical ? "vertical" : "horizontal"}
    className={`shrink-0 bg-line ${vertical ? "h-full w-px" : "h-px w-full"} ${className}`}
  />
);

export { Separator };
