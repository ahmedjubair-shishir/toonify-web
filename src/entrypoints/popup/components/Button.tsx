import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: LucideIcon;
}

/** Figma: Components > Button. Height 40, radius md, icon 16. */
export function Button({
  variant = 'secondary',
  icon: Icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button type="button" className={`btn btn--${variant} ${className ?? ''}`} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.67} aria-hidden="true" />}
      {children}
    </button>
  );
}
