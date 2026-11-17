import { useState } from 'react';
import type { AiTool } from '@/core/ai-tools';

interface AiToolPickerProps {
  tools: readonly AiTool[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * Which AI tool "Cartoonize" uses, for all sites. Each option says what it
 * needs (an account you paste into, or an API key), so people know before
 * choosing. Same native-radio pattern as the style picker.
 */
export function AiToolPicker({ tools, value, onChange }: AiToolPickerProps) {
  const [selected, setSelected] = useState(value);
  const [savedValue, setSavedValue] = useState(value);
  if (value !== savedValue) {
    setSavedValue(value);
    setSelected(value);
  }

  return (
    <fieldset className="picker" aria-describedby="ai-picker-hint">
      <legend className="overline">AI cartoonize</legend>
      <p id="ai-picker-hint" className="picker__hint">
        Redraw a photo you choose with your own AI tool. Used on every site.
      </p>
      {tools.map((tool) => (
        <label
          key={tool.id}
          className={`picker__option${tool.ready ? '' : ' picker__option--disabled'}`}
        >
          <input
            type="radio"
            name="toonify-ai-tool"
            value={tool.id}
            checked={tool.id === selected}
            disabled={!tool.ready}
            onChange={() => {
              setSelected(tool.id);
              onChange(tool.id);
            }}
          />
          <span className="picker__text">
            <span className="picker__name">{tool.label}</span>
            <span className="picker__description">{tool.needs}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
