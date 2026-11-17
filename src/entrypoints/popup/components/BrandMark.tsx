/** Toonify mark (Figma: Components > Brand/Mark). Decorative: the name is shown as text. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--tw-bg-accent)" />
      <path
        d="M14 9.5c.5 3.9 1.6 5 5.5 5.5-3.9.5-5 1.6-5.5 5.5-.5-3.9-1.6-5-5.5-5.5 3.9-.5 5-1.6 5.5-5.5Z"
        fill="var(--tw-text-on-accent)"
        transform="translate(0 3)"
      />
      <circle cx="24" cy="9" r="4" fill="var(--tw-bg-highlight)" />
      <circle cx="25" cy="21" r="2" fill="var(--tw-text-on-accent)" opacity="0.7" />
    </svg>
  );
}

export function Lockup() {
  return (
    <span className="lockup">
      <BrandMark />
      <span className="lockup__name">
        Toonify <span className="lockup__accent">Web</span>
      </span>
    </span>
  );
}
