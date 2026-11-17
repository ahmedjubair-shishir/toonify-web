import { Switch } from './Switch';

interface SiteToggleProps {
  site: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** The one control for the current site: a card with a label and a switch. */
export function SiteToggle({ site, checked, onChange }: SiteToggleProps) {
  return (
    <div className={`site-toggle${checked ? ' site-toggle--on' : ''}`}>
      <div className="site-toggle__text">
        <p className="site-toggle__title" aria-hidden="true">
          Toonify this site
        </p>
        <span id="site-switch-label" className="visually-hidden">
          Toonify on {site}
        </span>
        <p className="site-toggle__body">
          {checked
            ? `On in every ${site} tab. Other sites are not affected.`
            : 'Off. This site keeps its original look.'}
        </p>
      </div>
      <Switch checked={checked} onChange={onChange} labelledBy="site-switch-label" />
    </div>
  );
}
