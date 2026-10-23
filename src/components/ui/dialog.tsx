import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  description,
  children,
  onCloseAutoFocus,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        onCloseAutoFocus={onCloseAutoFocus}
        className="dialog-content"
      >
        <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
        {children}
        <DialogPrimitive.Close
          className="dialog-close"
          aria-label="Fechar diálogo"
        >
          <X />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
