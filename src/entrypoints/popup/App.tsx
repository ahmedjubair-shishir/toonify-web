import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { getPageSupport, type PageSupport } from '@/core/restricted-pages';
import { enabledSetting } from '@/core/settings';
import { Switch } from './components/Switch';

export function App() {
  // null = still loading from storage (avoids flashing the wrong state)
  const [enabled, setEnabled] = useState<boolean | null>(null);
  // null = still checking the active tab
  const [pageSupport, setPageSupport] = useState<PageSupport | null>(null);

  useEffect(() => {
    void enabledSetting.getValue().then(setEnabled);
    const unwatch = enabledSetting.watch(setEnabled);

    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setPageSupport(getPageSupport(tab?.url)));

    return unwatch;
  }, []);

  // Chrome only reveals a tab's URL for sites we have access to (all http/https
  // pages in Milestone 0). So "unknown" means a non-web page (chrome://, file://,
  // the new tab page...) and Toonify can't run there either.
  // Milestone 1 note: with optional host permissions, "unknown" can also mean
  // "regular site, not allowed yet". That state gets its own "Allow" UI.
  const restricted = pageSupport !== null && pageSupport !== 'supported';

  return (
    <main className="popup">
      <header className="popup__header">
        <span className="brand" aria-hidden="true">
          <span className="brand__mark" />
          <span className="brand__name">
            Toonify <span className="brand__accent">Web</span>
          </span>
        </span>
        <span id="global-switch-label" className="label">
          {enabled ? 'On' : 'Off'}
          <span className="visually-hidden"> - Toonify for all sites</span>
        </span>
        <Switch
          checked={enabled ?? false}
          disabled={enabled === null}
          labelledBy="global-switch-label"
          onChange={(value) => void enabledSetting.setValue(value)}
        />
      </header>

      <section className="popup__body" aria-live="polite">
        {restricted ? (
          <div className="alert alert--error" role="note">
            <p className="alert__title">Can&apos;t run on this page</p>
            <p className="alert__body">
              Browsers block extensions on settings pages and web stores. Open a regular website to
              use Toonify.
            </p>
          </div>
        ) : (
          <p className="status">
            {enabled
              ? 'Toonify is on. Open pages update instantly.'
              : 'Toonify is off. Pages show their original look.'}
          </p>
        )}
      </section>

      <footer className="popup__footer">
        <span className="caption">Milestone 0 · technical spike</span>
      </footer>
    </main>
  );
}
