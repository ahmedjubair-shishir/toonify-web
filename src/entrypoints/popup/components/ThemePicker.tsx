import { useState, type CSSProperties } from 'react';
import type { ThemeTokens } from '@/core/themes';

interface ThemePickerProps {
  themes: readonly ThemeTokens[];
  value: string;
  onChange: (id: string) => void;
}

/** A tiny sample button drawn with the theme's own numbers. */
function swatchStyle(theme: ThemeTokens): CSSProperties {
  const shadow = theme.buttonShadow;
  const lift =
    shadow === null
      ? ''
      : `, ${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.blur === 0 ? theme.line.button : 0}px var(--swatch-ink)`;
  return {
    borderRadius: Math.min(theme.radius.button, 10),
    boxShadow: `0 0 0 ${theme.line.button}px var(--swatch-ink)${lift}`,
    ['--swatch-ink' as string]: `color-mix(in srgb, var(--tw-text-primary) ${theme.inkStrength}%, transparent)`,
  };
}

/**
 * Simple style picker (Milestone 2). Native radio buttons, so arrow keys,
 * Space and screen readers work without custom code. A choice shows
 * instantly (saving takes a moment), and a newer saved value (e.g. from
 * another window) replaces it. The list is never re-created, so keyboard
 * focus stays put while arrowing through styles. Preview cards and the
 * full picker view come in Milestone 3 (Figma: Popup 06).
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
    <fieldset className="picker">
      <legend className="overline">Style</legend>
      {themes.map((theme) => (
        <label key={theme.id} className="picker__option">
          <input
            type="radio"
            name="toonify-theme"
            value={theme.id}
            checked={theme.id === selected}
            onChange={() => {
              setSelected(theme.id);
              onChange(theme.id);
            }}
          />
          <span className="picker__swatch" style={swatchStyle(theme)} aria-hidden="true" />
          <span className="picker__text">
            <span className="picker__name">{theme.name}</span>
            <span className="picker__description">{theme.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
