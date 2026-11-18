import { Check, Shapes } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  ICON_LOOKS,
  ICON_SETS,
  iconFilePath,
  type DrawnIconSetId,
  type IconChoice,
  type IconLookId,
  type IconMeaning,
  type IconOption,
  type IconSetId,
} from '@/core/icons';

interface IconPickerProps {
  value: IconChoice;
  onChange: (change: { set?: IconSetId; look?: IconLookId }) => void;
}

/** The real icon, drawn the same way the page draws it (a mask in the text colour). */
function IconPreview({
  set,
  meaning,
  look = 'plain',
  size = 16,
}: {
  set: DrawnIconSetId;
  meaning: IconMeaning;
  look?: IconLookId;
  size?: number;
}) {
  // Same files the pages use (generated at build time).
  const url = `url("/${iconFilePath(set, meaning, look)}")`;
  const style: CSSProperties = { width: size, height: size, WebkitMaskImage: url, maskImage: url };
  return (
    <span
      className={`icon-preview${look === 'animated' ? ' icon-preview--animated' : ''}`}
      style={style}
    />
  );
}

/**
 * A row of tiles backed by native radios (same pattern as the style picker:
 * the choice shows at once, a newer saved value replaces it, focus stays put).
 */
function TileGroup<Id extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  preview,
}: {
  legend: string;
  name: string;
  options: readonly IconOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  preview: (id: Id) => ReactNode;
}) {
  const [selected, setSelected] = useState(value);
  const [savedValue, setSavedValue] = useState(value);
  if (value !== savedValue) {
    setSavedValue(value);
    setSelected(value);
  }
  return (
    <fieldset className="tiles">
      <legend className="tiles__sublegend">{legend}</legend>
      <div className="tiles__grid tiles__grid--4">
        {options.map((option) => {
          const checked = option.id === selected;
          return (
            <label key={option.id} className="tile tile--compact" title={option.description}>
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                aria-describedby={`${name}-desc-${option.id}`}
                onChange={() => {
                  setSelected(option.id);
                  onChange(option.id);
                }}
              />
              {checked && (
                <span className="tile__check" aria-hidden="true">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
              <span className="tile__icon" aria-hidden="true">
                {preview(option.id)}
              </span>
              <span className="tile__name">{option.name}</span>
              <span id={`${name}-desc-${option.id}`} className="visually-hidden">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Icons section: which free icon set redraws the site's icons, and in what look. */
export function IconPicker({ value, onChange }: IconPickerProps) {
  // Looks are previewed with the chosen set (Lucide while icons stay original).
  const previewSet: DrawnIconSetId = value.set === 'original' ? 'lucide' : value.set;
  return (
    <section className="icon-picker" aria-labelledby="icon-picker-title">
      <h2 id="icon-picker-title" className="visually-hidden">
        Icons
      </h2>
      <TileGroup
        legend="Set"
        name="toonify-icon-set"
        options={ICON_SETS}
        value={value.set}
        onChange={(set) => onChange({ set })}
        preview={(set) =>
          set === 'original' ? (
            <Shapes size={18} strokeWidth={1.8} />
          ) : (
            <IconPreview set={set} meaning="heart" size={18} />
          )
        }
      />
      <TileGroup
        legend="Look"
        name="toonify-icon-look"
        options={ICON_LOOKS}
        value={value.look}
        onChange={(look) => onChange({ look })}
        preview={(look) => <IconPreview set={previewSet} meaning="star" look={look} size={20} />}
      />
    </section>
  );
}
