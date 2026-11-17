import { Globe } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge, type BadgeTone } from './StatusBadge';

interface SiteRowProps {
  label: string;
  faviconUrl?: string | undefined;
  tone: BadgeTone;
}

/** Figma: Components > Site Context (favicon, domain, live status) . */
export function SiteRow({ label, faviconUrl, tone }: SiteRowProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showFavicon = faviconUrl && /^(https?|data):/.test(faviconUrl) && !faviconFailed;

  return (
    <div className="site">
      <span className="site__favicon" aria-hidden="true">
        {showFavicon ? (
          <img
            src={faviconUrl}
            alt=""
            width={16}
            height={16}
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <Globe size={14} strokeWidth={1.8} />
        )}
      </span>
      <span id="site-label" className="site__domain" title={label}>
        {label}
      </span>
      <span aria-live="polite">
        <StatusBadge tone={tone} />
      </span>
    </div>
  );
}
