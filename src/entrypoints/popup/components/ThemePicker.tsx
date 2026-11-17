import { Check } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { mediaFilter } from '@/content/theme-css';
import type { InkShadow, ThemeTokens } from '@/core/themes';

interface ThemePickerProps {
  themes: readonly ThemeTokens[];
  value: string;
  onChange: (id: string) => void;
}

/** Scales a theme's numbers down to the tiny preview (tiles are ~1/3 size). */
const small = (px: number, max: number) => Math.min(max, Math.round(px * 0.6 * 10) / 10);

const shadowCss = (shadow: InkShadow | null, spread: number, ink: string, soft: string) =>
  shadow === null
    ? ''
    : `, ${small(shadow.x, 4)}px ${small(shadow.y, 4)}px ${small(shadow.blur, 8)}px ${shadow.blur === 0 ? spread : 0}px ${shadow.blur === 0 ? ink : soft}`;

/** Ink colours for the preview, like the page engine but on the popup's text colour. */
function inkVars(theme: ThemeTokens): CSSProperties {
  const base = theme.ink ?? 'var(--tw-text-primary)';
  return {
    ['--tile-ink' as string]: `color-mix(in srgb, ${base} ${theme.inkStrength}%, transparent)`,
    ['--tile-ink-soft' as string]: `color-mix(in srgb, ${base} ${Math.round(theme.inkStrength / 2)}%, transparent)`,
    ['--tile-frame' as string]: theme.frame ?? 'var(--tile-ink)',
  };
}

/** Mini photo: the theme's frame, corners, shadow and colour treatment. */
function photoStyle(theme: ThemeTokens): CSSProperties {
  const line = small(theme.line.media, 3);
  return {
    borderRadius: small(theme.radius.media, 10),
    outline: `${line}px solid var(--tile-frame)`,
    outlineOffset: -line,
    filter: mediaFilter(theme.media),
    boxShadow:
      shadowCss(theme.mediaShadow, 0, 'var(--tile-ink)', 'var(--tile-ink-soft)').replace(
        /^, /,
        '',
      ) || 'none',
  };
}

/** Mini button: the theme's line, corners and lift. */
function buttonStyle(theme: ThemeTokens): CSSProperties {
  const line = Math.max(1, small(theme.line.button, 2));
  return {
    borderRadius: small(theme.radius.button, 8),
    boxShadow: `0 0 0 ${line}px var(--tile-ink)${shadowCss(theme.buttonShadow, line, 'var(--tile-ink)', 'var(--tile-ink-soft)')}`,
  };
}

/**
 * Style picker as a tile grid (owner feedback: the list was hard to scan;
 * Figma: Popup 06 preset grid). Each tile previews the style with its own
 * numbers. Native radio buttons underneath, so arrow keys, Space and screen
 * readers work without custom code. A choice shows instantly (saving takes a
 * moment); a newer saved value (e.g. from another window) replaces it. The
 * grid is never re-created, so keyboard focus stays put while arrowing.
 */
export function ThemePicker({ themes, value, onChange }: ThemePickerProps) {
  const [selected, setSelected] = useState(value);
  const [savedValue, setSavedValue] = useState(value);
  // React's "adjust state when a prop changes" pattern (no effect needed).
  if (value !== savedValue) {
    setSavedValue(value);
    setSelected(value);
  }

  return (
    <fieldset className="tiles">
      <legend className="overline">Style</legend>
      <div className="tiles__grid">
        {themes.map((theme) => {
          const checked = theme.id === selected;
          return (
            <label key={theme.id} className="tile" title={theme.description}>
              <input
                type="radio"
                name="toonify-theme"
                value={theme.id}
                checked={checked}
                aria-describedby={`theme-desc-${theme.id}`}
                onChange={() => {
                  setSelected(theme.id);
                  onChange(theme.id);
                }}
              />
              <span className="tile__preview" style={inkVars(theme)} aria-hidden="true">
                <span className="tile__photo" style={photoStyle(theme)} />
                <span className="tile__button" style={buttonStyle(theme)} />
                {checked && (
                  <span className="tile__check">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="tile__name">{theme.name}</span>
              <span id={`theme-desc-${theme.id}`} className="visually-hidden">
                {theme.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
