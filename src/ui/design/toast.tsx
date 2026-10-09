import { X } from "lucide-react";
import { Toast as RadixToast } from "radix-ui";
import type { ReactNode } from "react";
import { IconButton } from "./button";

const TOAST_MS = 4000;

interface ToastProps {
  tone?: "info" | "error";
  children: ReactNode;
  onClose: () => void;
}

/** Transient message; announced to screen readers, swipe or Escape to dismiss. */
const Toast = ({ tone = "info", children, onClose }: ToastProps) => (
  <RadixToast.Root
    duration={TOAST_MS}
    type={tone === "error" ? "foreground" : "background"}
    onOpenChange={(open) => !open && onClose()}
    className={`flex items-center gap-2 rounded-md border bg-raised px-3 py-2 shadow-lg ${tone === "error" ? "border-bad/50 text-bad" : "border-line-strong"}`}
  >
    <RadixToast.Description>{children}</RadixToast.Description>
    <RadixToast.Close asChild>
      <IconButton label="Dismiss" icon={<X size={12} />} className="ml-auto size-6!" />
    </RadixToast.Close>
  </RadixToast.Root>
);

/** Wraps the app; `ToastViewport` is where toasts stack. */
const ToastProvider = ({ children }: { children: ReactNode }) => <RadixToast.Provider swipeDirection="right">{children}</RadixToast.Provider>;

const ToastViewport = () => <RadixToast.Viewport className="fixed right-3 bottom-16 z-50 flex w-80 flex-col gap-2 outline-none" />;

export { Toast, ToastProvider, ToastViewport };
