import { Check, Pencil, Plus, Shapes, X } from 'lucide-react';
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import {
  POPULAR_ICONIFY_SETS,
  downloadIconSet,
  getCustomIconSets,
  removeCustomIconSet,
  saveCustomIconSet,
  watchCustomIconSets,
  type CustomIconSet,
} from '@/core/custom-icons';
import {
  ICON_LOOKS,
  ICON_MEANINGS,
  ICON_SETS,
  customSetRef,
  iconFilePath,
  isDrawnSet,
  svgDataUrl,
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
  /** Short confirmation ("Removed Heroicons"), shown as the popup's toast. */
  onNotify: (message: string) => void;
}

/** A drawing shown the same way pages show it (a mask in the text colour). */
function MaskPreview({ url, size, animated }: { url: string; size: number; animated?: boolean }) {
  const mask = `url("${url}")`;
  const style: CSSProperties = {
    width: size,
    height: size,
    WebkitMaskImage: mask,
    maskImage: mask,
  };
  return (
    <span className={`icon-preview${animated ? ' icon-preview--animated' : ''}`} style={style} />
  );
}

/** Built-in icon: the same file pages use (generated at build time). */
const builtInUrl = (set: DrawnIconSetId, meaning: IconMeaning, look: IconLookId = 'plain') =>
  `/${iconFilePath(set, meaning, look)}`;

/** A custom set's sample: the preferred icon, or else the first icon it has. */
function customSample(set: CustomIconSet, prefer: IconMeaning): string | null {
  const meaning = set.icons[prefer] ? prefer : ICON_MEANINGS.find((m) => set.icons[m]);
  return meaning ? (set.icons[meaning] ?? null) : null;
}

const countIcons = (set: CustomIconSet) => Object.keys(set.icons).length;

/**
 * A row of tiles backed by native radios (same pattern as the style picker:
 * the choice shows at once, a newer saved value replaces it, focus stays put).
 * The heading row can hold small actions (Add new, Edit).
 */
function TileGroup<Id extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  preview,
  actions,
  removable,
}: {
  legend: string;
  name: string;
  options: readonly IconOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  preview: (id: Id) => ReactNode;
  actions?: ReactNode;
  /** In edit mode: which tiles can be removed, and how. */
  removable?: { canRemove: (id: Id) => boolean; onRemove: (id: Id, name: string) => void };
}) {
  const [selected, setSelected] = useState(value);
  const [savedValue, setSavedValue] = useState(value);
  if (value !== savedValue) {
    setSavedValue(value);
    setSelected(value);
  }
  return (
    <fieldset className="tiles">
      <legend className="visually-hidden">{legend}</legend>
      <div className="tiles__header">
        <span className="tiles__sublegend" aria-hidden="true">
          {legend}
        </span>
        {actions && <span className="tiles__actions">{actions}</span>}
      </div>
      <div className="tiles__grid tiles__grid--4">
        {options.map((option) => {
          const checked = option.id === selected;
          const canRemove = removable?.canRemove(option.id) ?? false;
          return (
            <div key={option.id} className="tile-wrap">
              <label className="tile tile--compact" title={option.description}>
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
                {checked && !canRemove && (
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
              {canRemove && (
                <button
                  type="button"
                  className="tile__remove"
                  aria-label={`Remove ${option.name}`}
                  title={`Remove ${option.name}`}
                  onClick={() => removable?.onRemove(option.id, option.name)}
                >
                  <X size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

type FormState = { kind: 'open'; error?: string } | { kind: 'busy'; progress: string };

/**
 * Add an icon set: one click on a popular free set (Iconify). Toonify
 * downloads its icons once and keeps them in the browser.
 *
 * Pasting links is hidden for now (owner decision, 19 Nov 2026): an icon-font
 * CDN link holds letters in a font, not pictures, and fonts can't replace SVG
 * or image icons without changing the page. The link code stays in
 * custom-icons.ts for later.
 */
function AddIconSet({
  saved,
  onSaved,
  onClose,
}: {
  saved: readonly CustomIconSet[];
  onSaved: (ref: IconSetId, found: number, name: string) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<FormState>({ kind: 'open' });
  const id = useId();
  const busy = state.kind === 'busy';

  const add = async (prefix: string, name: string) => {
    setState({ kind: 'busy', progress: `Downloading ${name}…` });
    try {
      const source = { kind: 'iconify', prefix } as const;
      const result = await downloadIconSet(source);
      const ref = await saveCustomIconSet(name, source, result);
      onSaved(ref, result.found, name);
    } catch (problem) {
      setState({
        kind: 'open',
        error:
          problem instanceof Error ? problem.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <div className="custom-set-form" role="group" aria-labelledby={`${id}-title`}>
      <div className="custom-set-form__head">
        <p id={`${id}-title`} className="custom-set-form__title">
          Add an icon set
        </p>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <p className="custom-set-form__hint">
        Free sets from Iconify. Downloaded once and kept in your browser.
      </p>
      <div className="chip-list" role="group" aria-label="Popular icon sets">
        {POPULAR_ICONIFY_SETS.map((set) => {
          const added = saved.some((custom) => custom.source === `iconify:${set.prefix}`);
          return (
            <button
              key={set.prefix}
              type="button"
              className={`chip${added ? ' chip--added' : ''}`}
              disabled={busy || added}
              onClick={() => void add(set.prefix, set.name)}
            >
              {added && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}
              {set.name}
              {added && <span className="visually-hidden"> (added)</span>}
            </button>
          );
        })}
      </div>
      <p
        className={`custom-set-form__status${state.kind === 'open' && state.error ? ' custom-set-form__status--error' : ''}`}
        role={state.kind === 'open' && state.error ? 'alert' : 'status'}
      >
        {state.kind === 'busy' ? state.progress : (state.error ?? '')}
      </p>
    </div>
  );
}

/** Saved custom sets, kept in sync with storage (other windows too). */
function useCustomIconSets(): CustomIconSet[] {
  const [sets, setSets] = useState<CustomIconSet[]>([]);
  useEffect(() => {
    let live = true;
    void getCustomIconSets().then((value) => {
      if (live) setSets(value);
    });
    const unwatch = watchCustomIconSets(setSets);
    return () => {
      live = false;
      unwatch();
    };
  }, []);
  return sets;
}

/** Icons section: which icon set redraws the site's icons, and in what look. */
export function IconPicker({ value, onChange, onNotify }: IconPickerProps) {
  const customSets = useCustomIconSets();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const isEditing = editing && customSets.length > 0;

  const setOptions: IconOption<IconSetId>[] = [
    ...ICON_SETS,
    ...customSets.map((set) => ({
      id: customSetRef(set.id),
      name: set.name,
      description: `Added set, ${countIcons(set)} of ${ICON_MEANINGS.length} icons`,
    })),
  ];
  // A removed set: show Original until the saved value catches up.
  const setValue = setOptions.some((option) => option.id === value.set) ? value.set : 'original';
  const customFor = (id: IconSetId) => customSets.find((set) => customSetRef(set.id) === id);
  const selectedCustom = customFor(value.set);

  const lookPreview = (look: IconLookId) => {
    const animated = look === 'animated';
    if (selectedCustom) {
      const svg = customSample(selectedCustom, 'star');
      if (svg) return <MaskPreview url={svgDataUrl(svg, look)} size={20} animated={animated} />;
    }
    const set: DrawnIconSetId = isDrawnSet(value.set) ? value.set : 'lucide';
    return <MaskPreview url={builtInUrl(set, 'star', look)} size={20} animated={animated} />;
  };

  const setPreview = (id: IconSetId) => {
    if (id === 'original') return <Shapes size={18} strokeWidth={1.8} />;
    if (isDrawnSet(id)) return <MaskPreview url={builtInUrl(id, 'heart')} size={18} />;
    const custom = customFor(id);
    const svg = custom ? customSample(custom, 'heart') : null;
    return svg ? (
      <MaskPreview url={svgDataUrl(svg)} size={18} />
    ) : (
      <Shapes size={18} strokeWidth={1.8} />
    );
  };

  const setActions = (
    <>
      {customSets.length > 0 && (
        <button
          type="button"
          className="text-btn"
          aria-pressed={isEditing}
          onClick={() => {
            setAdding(false);
            setEditing(!isEditing);
          }}
        >
          {isEditing ? (
            'Done'
          ) : (
            <>
              <Pencil size={12} strokeWidth={2} aria-hidden="true" /> Edit
            </>
          )}
        </button>
      )}
      {!adding && !isEditing && (
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setAdding(true);
          }}
        >
          <Plus size={12} strokeWidth={2.5} aria-hidden="true" /> Add new
        </button>
      )}
    </>
  );

  return (
    <section className="icon-picker" aria-labelledby="icon-picker-title">
      <h2 id="icon-picker-title" className="visually-hidden">
        Icons
      </h2>
      <TileGroup
        legend="Set"
        name="toonify-icon-set"
        options={setOptions}
        value={setValue}
        onChange={(set) => onChange({ set })}
        preview={setPreview}
        actions={setActions}
        {...(isEditing
          ? {
              removable: {
                canRemove: (id: IconSetId) => customFor(id) !== undefined,
                onRemove: (id: IconSetId, name: string) => {
                  const custom = customFor(id);
                  if (!custom) return;
                  void removeCustomIconSet(custom.id).then(() => onNotify(`Removed ${name}`));
                },
              },
            }
          : {})}
      />
      {adding && (
        <AddIconSet
          saved={customSets}
          onClose={() => setAdding(false)}
          onSaved={(ref, found, name) => {
            setAdding(false);
            onNotify(`${name} added: ${found} of ${ICON_MEANINGS.length} icons found`);
            onChange({ set: ref });
          }}
        />
      )}
      <TileGroup
        legend="Look"
        name="toonify-icon-look"
        options={ICON_LOOKS}
        value={value.look}
        onChange={(look) => onChange({ look })}
        preview={lookPreview}
      />
    </section>
  );
}
