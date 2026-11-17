import { CircleCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

/**
 * Figma: Components > Toast. role="status" so screen readers announce it
 * politely. Auto-dismisses after 5s, paused while hovered or focused.
 */
export function Toast({ message, onDismiss, durationMs = 5000 }: ToastProps) {
  const [paused, setPaused] = useState(false);
  // Keep the latest callback without restarting the timer on every render.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (message === null || paused) return;
    const timer = setTimeout(() => dismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [message, paused, durationMs]);

  return (
    <div role="status" aria-live="polite" className="toast-region">
      {message !== null && (
        <div
          className="toast"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <CircleCheck size={18} strokeWidth={1.8} className="toast__icon" aria-hidden="true" />
          <span className="toast__message">{message}</span>
          <button type="button" className="toast__close" aria-label="Dismiss" onClick={onDismiss}>
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
