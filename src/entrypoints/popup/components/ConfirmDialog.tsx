import { useEffect, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Figma: Components > Dialog. Uses the native <dialog> element, which gives
 * us a focus trap, Esc to close and focus return to the trigger for free.
 */
export function ConfirmDialog({
  open,
  icon: Icon,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-body"
      onCancel={(event) => {
        event.preventDefault(); // keep React in charge of `open`
        onCancel();
      }}
    >
      <span className="dialog__icon">
        <Icon size={20} strokeWidth={1.67} aria-hidden="true" />
      </span>
      <h2 id="dialog-title" className="dialog__title">
        {title}
      </h2>
      <p id="dialog-body" className="dialog__body">
        {children}
      </p>
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
