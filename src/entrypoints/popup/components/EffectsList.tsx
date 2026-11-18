import {
  Grid3x3,
  Heading,
  MousePointerClick,
  PenLine,
  Sticker,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { EffectId, EffectInfo, Effects } from '@/core/effects';
import { Switch } from './Switch';

const ICONS: Record<EffectId, LucideIcon> = {
  sketch: PenLine,
  sticker: Sticker,
  bouncy: MousePointerClick,
  headings: Heading,
  texture: Grid3x3,
};

interface EffectsListProps {
  effects: readonly EffectInfo[];
  value: Effects;
  onChange: (id: EffectId, on: boolean) => void;
}

/**
 * Per-site effect switches (Figma: Popup > Quick effects, Setting Row).
 * Each row shows its new state at once; saving takes a moment.
 */
export function EffectsList({ effects, value, onChange }: EffectsListProps) {
  const [local, setLocal] = useState(value);
  const [saved, setSaved] = useState(value);
  if (value !== saved) {
    setSaved(value);
    setLocal(value);
  }

  return (
    <section className="effects" aria-labelledby="effects-title">
      <h2 id="effects-title" className="visually-hidden">
        Effects
      </h2>
      <ul className="effects__list">
        {effects.map((effect) => (
          <li key={effect.id} className="effects__row">
            {(() => {
              const Icon = ICONS[effect.id];
              return (
                <span className="effects__icon" aria-hidden="true">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
              );
            })()}
            <span className="effects__text">
              <span id={`effect-${effect.id}`} className="effects__name">
                {effect.label}
              </span>
              <span className="effects__description">{effect.description}</span>
            </span>
            <Switch
              checked={local[effect.id]}
              labelledBy={`effect-${effect.id}`}
              onChange={(on) => {
                setLocal({ ...local, [effect.id]: on });
                onChange(effect.id, on);
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
