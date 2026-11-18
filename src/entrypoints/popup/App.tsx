import { Ban, Check, Lock, Pause, Power, RotateCcw, RotateCw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { availableAiTools, getAiTool, isAiFeatureEnabled } from '@/core/ai-tools';
import { EFFECTS, resolveEffects } from '@/core/effects';
import { ICON_LOOKS, ICON_SETS, resolveIcons } from '@/core/icons';
import { THEMES, getTheme } from '@/core/themes';
import { Lockup } from './components/BrandMark';
import { Button } from './components/Button';
import { ConfirmDialog } from './components/ConfirmDialog';
import { EmptyState } from './components/EmptyState';
import { PowerButton } from './components/PowerButton';
import { SiteRow } from './components/SiteRow';
import { SiteToggle } from './components/SiteToggle';
import { AiToolPicker } from './components/AiToolPicker';
import { EffectsList } from './components/EffectsList';
import { IconPicker } from './components/IconPicker';
import { SectionTabs } from './components/SectionTabs';
import { ThemePicker } from './components/ThemePicker';
import { Toast } from './components/Toast';
import { usePopupState } from './usePopupState';

function pageLabel(url: string | undefined): string {
  if (!url) return 'This page';
  try {
    const { protocol, host } = new URL(url);
    if (!host) return 'This page'; // about:blank, data: and similar
    return protocol.startsWith('http') ? host.replace(/^www\./, '') : `${protocol}//${host}`;
  } catch {
    return 'This page';
  }
}

/** "Off", "1 on", "3 on" for the Effects tab. */
function effectsSummary(effects: Record<string, boolean>): string {
  const on = Object.values(effects).filter(Boolean).length;
  return on === 0 ? 'Off' : `${on} on`;
}

/** "Original", "Lucide", "Original · Cartoon" for the Icons tab. */
function iconsSummary(set: unknown, look: unknown): string {
  const choice = resolveIcons(set, look);
  const setName = ICON_SETS.find((option) => option.id === choice.set)?.name ?? '';
  if (choice.look === 'plain') return setName;
  const lookName = ICON_LOOKS.find((option) => option.id === choice.look)?.name ?? '';
  return `${setName} · ${lookName}`;
}

export function App() {
  const { view, site, tab, settings, hasAccess, actions } = usePopupState();
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const label = site ?? pageLabel(tab?.url);
  const globalOn = settings.globalEnabled;

  return (
    <main className="popup" aria-busy={view.kind === 'loading'}>
      <header className="popup__header">
        <Lockup />
        <PowerButton
          on={globalOn}
          disabled={view.kind === 'loading'}
          onChange={actions.setGlobalEnabled}
        />
      </header>

      <section className="popup__body">
        {view.kind === 'loading' && <div className="skeleton" aria-label="Loading" />}

        {view.kind === 'restricted' && (
          <>
            <SiteRow label={label} tone="unsupported" />
            <div className="alert alert--error" role="note">
              <Ban size={18} strokeWidth={1.8} className="alert__icon" aria-hidden="true" />
              <div>
                <p className="alert__title">Can&apos;t run on this page</p>
                <p className="alert__body">
                  Browsers block extensions on settings pages and web stores. Open a regular website
                  to use Toonify.
                </p>
              </div>
            </div>
          </>
        )}

        {view.kind === 'paused' && (
          <EmptyState
            icon={Pause}
            title="Toonify is paused"
            action={
              <Button variant="primary" icon={Power} onClick={() => actions.setGlobalEnabled(true)}>
                Resume Toonify
              </Button>
            }
          >
            Every site shows its original look. Your site choices are saved.
          </EmptyState>
        )}

        {view.kind === 'needs-access' && site && (
          <>
            <SiteRow label={site} faviconUrl={tab?.favIconUrl} tone="needs-access" />
            <EmptyState
              icon={Lock}
              tone="accent"
              title="Allow Toonify on this site?"
              action={
                <Button
                  variant="primary"
                  icon={Check}
                  onClick={() =>
                    actions.allowSite().catch((error: unknown) => {
                      // Keep Chrome's exact reason for debugging (popup > Inspect > Console).
                      console.error('Toonify: access request failed', error);
                      setToast("Chrome didn't allow access. Please try again.");
                    })
                  }
                >
                  Allow on {site}
                </Button>
              }
            >
              Toonify needs your OK to change how {site} looks. It won&apos;t read or send anything
              from the page.
            </EmptyState>
          </>
        )}

        {view.kind === 'site-off' && site && (
          <>
            <SiteRow label={site} faviconUrl={tab?.favIconUrl} tone="off" />
            <SiteToggle site={site} checked={false} onChange={actions.setSiteEnabled} />
          </>
        )}

        {view.kind === 'active' && site && (
          <>
            <SiteRow label={site} faviconUrl={tab?.favIconUrl} tone="active" />
            <SiteToggle site={site} checked onChange={actions.setSiteEnabled} />
            <SectionTabs
              storageKey="toonify-popup-tab"
              tabs={[
                {
                  id: 'style',
                  label: 'Style',
                  summary: getTheme(settings.sites[site]?.theme).name,
                  panel: (
                    <ThemePicker
                      themes={THEMES}
                      value={getTheme(settings.sites[site]?.theme).id}
                      onChange={actions.setSiteTheme}
                    />
                  ),
                },
                {
                  id: 'effects',
                  label: 'Effects',
                  summary: effectsSummary(resolveEffects(settings.sites[site]?.effects)),
                  panel: (
                    <EffectsList
                      effects={EFFECTS}
                      value={resolveEffects(settings.sites[site]?.effects)}
                      onChange={actions.setSiteEffect}
                    />
                  ),
                },
                {
                  id: 'icons',
                  label: 'Icons',
                  summary: iconsSummary(
                    settings.sites[site]?.iconSet,
                    settings.sites[site]?.iconLook,
                  ),
                  panel: (
                    <IconPicker
                      value={resolveIcons(
                        settings.sites[site]?.iconSet,
                        settings.sites[site]?.iconLook,
                      )}
                      onChange={actions.setSiteIcons}
                    />
                  ),
                },
              ]}
            />
            {isAiFeatureEnabled() && (
              <AiToolPicker
                tools={availableAiTools()}
                value={getAiTool(settings.aiTool).id}
                onChange={actions.setAiTool}
              />
            )}
            {view.applied === false && (
              <div className="alert alert--warning" role="note">
                <TriangleAlert
                  size={18}
                  strokeWidth={1.8}
                  className="alert__icon"
                  aria-hidden="true"
                />
                <div>
                  <p className="alert__title">Reload to apply</p>
                  <p className="alert__body">This tab was open before Toonify was allowed here.</p>
                  <Button
                    variant="secondary"
                    icon={RotateCw}
                    className="alert__action"
                    onClick={actions.reloadTab}
                  >
                    Reload page
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <footer className="popup__footer">
        {hasAccess && site && view.kind !== 'paused' && (
          <Button variant="ghost" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
            Reset site
          </Button>
        )}
        <span className="caption">v0.1 preview</span>
      </footer>

      <Toast message={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={confirmReset}
        icon={RotateCcw}
        title="Reset this site?"
        confirmLabel="Reset site"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void actions
            .resetSite()
            .then(() => setToast(`${site ?? 'Site'} restored to its original look`));
        }}
      >
        This removes Toonify&apos;s styling and access for {site}. You can allow it again any time.
      </ConfirmDialog>
    </main>
  );
}
