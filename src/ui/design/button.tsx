import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./tooltip";

type Variant = "primary" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  /** Render the single child (e.g. a link) with button styling. */
  asChild?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-text text-bg hover:bg-white aria-disabled:bg-line-strong aria-disabled:text-muted",
  outline: "border border-line bg-panel hover:bg-raised",
  ghost: "hover:bg-raised",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
};

/**
 * Prefer `aria-disabled` over `disabled` when the reason is in a tooltip:
 * it keeps the button focusable so keyboard users can read why.
 */
const Button = ({ variant = "outline", size = "md", asChild = false, className = "", type = "button", ...props }: ButtonProps) => {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      type={asChild ? undefined : type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${
        size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3"
      } ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
};

interface IconButtonProps extends Omit<ButtonProps, "children" | "asChild"> {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  icon: ReactNode;
}

const IconButton = ({ label, icon, variant = "ghost", size = "sm", className = "", ...props }: IconButtonProps) => (
  <Tooltip content={label}>
    <Button aria-label={label} variant={variant} size={size} className={`aspect-square px-0! ${className}`} {...props}>
      {icon}
    </Button>
  </Tooltip>
);

export { Button, IconButton };
