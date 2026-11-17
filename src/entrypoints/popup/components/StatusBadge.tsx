import { Ban, CircleCheck, CircleOff, Lock, Pause, type LucideIcon } from 'lucide-react';

export type BadgeTone = 'active' | 'off' | 'needs-access' | 'paused' | 'unsupported';

const BADGES: Record<BadgeTone, { label: string; icon: LucideIcon }> = {
  active: { label: 'Active', icon: CircleCheck },
  off: { label: 'Off here', icon: CircleOff },
  'needs-access': { label: 'Needs access', icon: Lock },
  paused: { label: 'Paused', icon: Pause },
  unsupported: { label: "Can't run here", icon: Ban },
};

/** Figma: Components > Status Badge. Always icon + text, never colour alone. */
export function StatusBadge({ tone }: { tone: BadgeTone }) {
  const { label, icon: Icon } = BADGES[tone];
  return (
    <span className={`badge badge--${tone}`}>
      <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </span>
  );
}
