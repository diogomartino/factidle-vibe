import { X } from "lucide-react";
import { AlertDialog, Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button, IconButton } from "./button";

const OVERLAY = "fixed inset-0 z-50 bg-black/60";
const CONTENT =
  "outline-none fixed top-1/2 left-1/2 z-50 max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line-strong bg-panel p-4 text-text shadow-2xl";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Modal panel with a title and close button; focus trap and Escape handled by Radix. */
const Dialog = ({ open, onOpenChange, title, children, className = "w-[min(92vw,960px)]" }: DialogProps) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY} />
      <RadixDialog.Content
        className={`${CONTENT} ${className}`}
        aria-describedby={undefined}
        // Focus the dialog itself rather than the close button, so its tooltip doesn't pop up.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <RadixDialog.Title className="flex items-center gap-2 text-sm font-semibold">{title}</RadixDialog.Title>
          <RadixDialog.Close asChild>
            <IconButton label="Close" icon={<X size={14} />} className="ml-auto" />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation for destructive actions; Cancel is focused first. */
const ConfirmDialog = ({ open, title, children, confirmLabel, danger, onConfirm, onClose }: ConfirmDialogProps) => (
  <AlertDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className={OVERLAY} />
      <AlertDialog.Content className={`${CONTENT} w-96`}>
        <AlertDialog.Title className="text-sm font-semibold">{title}</AlertDialog.Title>
        <AlertDialog.Description className="mt-2 text-muted">{children}</AlertDialog.Description>
        <div className="mt-4 flex justify-end gap-2">
          <AlertDialog.Cancel asChild>
            <Button>Cancel</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);

export { ConfirmDialog, Dialog };
