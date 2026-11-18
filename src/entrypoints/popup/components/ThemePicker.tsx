import {
  BookOpen,
  Brush,
  Check,
  CircleOff,
  Clapperboard,
  Droplets,
  Feather,
  Landmark,
  MessageSquareQuote,
  Newspaper,
  Pencil,
  Smile,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { StyleOption } from '@/core/themes';

interface ThemePickerProps {
  themes: readonly StyleOption[];
  value: string;
  onChange: (id: string) => void;
}

/** One recognisable icon per style (owner feedback: icons read faster than previews). */
const THEME_ICONS: Readonly<Record<string, LucideIcon>> = {
  original: CircleOff,
  'classic-cartoon': Smile,
  'comic-book': MessageSquareQuote,
  storybook: BookOpen,
  watercolor: Droplets,
  'pencil-sketch': Pencil,
  'pop-art': Zap,
  'oil-painting': Brush,
  'vintage-poster': Newspaper,
  'cel-shaded': Clapperboard,
  'monochrome-ink': Feather,
  renaissance: Landmark,
};

/**
 * Style picker as a tile grid: icon above the name, centred (Figma: Popup 06
 * preset grid). Native radio buttons underneath, so arrow keys, Space and
 * screen readers work without custom code. A choice shows instantly (saving
 * takes a moment); a newer saved value (e.g. from another window) replaces
 * it. The grid is never re-created, so keyboard focus stays put while arrowing.
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
      <legend className="visually-hidden">Style</legend>
      <div className="tiles__grid">
        {themes.map((theme) => {
          const checked = theme.id === selected;
          const Icon = THEME_ICONS[theme.id] ?? Smile;
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
              {checked && (
                <span className="tile__check" aria-hidden="true">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
              <span className="tile__icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.8} />
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
