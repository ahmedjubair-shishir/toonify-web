import { Power } from 'lucide-react';

interface PowerButtonProps {
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}

/**
 * Master on/off for Toonify on every site. Deliberately not a switch, so it
 * can't be confused with the per-site switch in the middle of the popup.
 * A toggle button (aria-pressed) with a visible state word next to the icon.
 */
export function PowerButton({ on, onChange, disabled = false }: PowerButtonProps) {
  return (
    <button
      type="button"
      className={`power${on ? ' power--on' : ''}`}
      aria-pressed={on}
      aria-label="Toonify on all sites"
      title={on ? 'Pause Toonify on every site' : 'Resume Toonify on allowed sites'}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <Power size={14} strokeWidth={2} aria-hidden="true" />
      <span aria-hidden="true">{on ? 'On' : 'Paused'}</span>
    </button>
  );
}
