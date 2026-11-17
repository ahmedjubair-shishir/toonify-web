import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'accent';
}

/** Centered card used by the Off, Needs access and Paused states (Figma: Popup 02, 05, 09). */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <div className="empty">
      <span className={`empty__icon empty__icon--${tone}`}>
        <Icon size={24} strokeWidth={1.67} aria-hidden="true" />
      </span>
      <h2 className="empty__title">{title}</h2>
      <p className="empty__body">{children}</p>
      {action}
    </div>
  );
}
