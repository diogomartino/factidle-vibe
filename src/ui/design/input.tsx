import type { InputHTMLAttributes } from "react";

/** Text/number field matching the other controls. Pair with a label or aria-label. */
const Input = ({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`h-8 rounded-md border border-line bg-panel px-2 text-xs placeholder:text-muted ${className}`} {...props} />
);

export { Input };
