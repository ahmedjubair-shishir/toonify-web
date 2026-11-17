interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** id of the visible text that names this switch (for screen readers). */
  labelledBy: string;
  disabled?: boolean;
}

/**
 * Accessible on/off switch (Figma: Components > Switch).
 * A real <button> with role="switch", so Tab, Space and Enter work for free.
 */
export function Switch({ checked, onChange, labelledBy, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" aria-hidden="true" />
    </button>
  );
}
