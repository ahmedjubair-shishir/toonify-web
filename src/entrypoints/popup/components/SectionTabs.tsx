import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface SectionTab {
  id: string;
  label: string;
  /** What is chosen right now (e.g. "Comic Book", "2 on"), shown under the label. */
  summary: string;
  panel: ReactNode;
}

interface SectionTabsProps {
  tabs: readonly SectionTab[];
  /** Remembers the last tab between popup openings (this browser only). */
  storageKey?: string;
}

function savedTab(key: string | undefined, tabs: readonly SectionTab[]): string {
  const first = tabs[0]?.id ?? '';
  if (!key) return first;
  try {
    const saved = localStorage.getItem(key);
    return tabs.some((tab) => tab.id === saved) && saved ? saved : first;
  } catch {
    return first; // storage can be unavailable; the first tab is a fine default
  }
}

/**
 * Popup sections as tabs (owner feedback: one long scroll hid Effects and
 * Icons). Each tab shows its current choice, so users see what is set
 * without opening it. WAI-ARIA tabs pattern: Left/Right/Home/End move
 * between tabs and open them; Tab moves into the open panel.
 */
export function SectionTabs({ tabs, storageKey }: SectionTabsProps) {
  const [active, setActive] = useState(() => savedTab(storageKey, tabs));
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const open = (id: string, focus = false) => {
    setActive(id);
    if (focus) refs.current[id]?.focus();
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, id);
      } catch {
        // not saved; nothing else depends on it
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    const target = tabs[next];
    if (!target) return;
    event.preventDefault();
    open(target.id, true);
  };

  return (
    <div className="section-tabs">
      <div className="section-tabs__list" role="tablist" aria-label="Customize this site">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              className="section-tabs__tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(tab.id)}
              onKeyDown={onKeyDown}
            >
              <span className="section-tabs__label">{tab.label}</span>
              <span className="section-tabs__summary">{tab.summary}</span>
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          className="section-tabs__panel"
          hidden={tab.id !== active}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
