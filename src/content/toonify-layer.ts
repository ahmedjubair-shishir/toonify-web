/**
 * The Toonify "layer": everything we add to a web page lives behind ONE
 * attribute on <html> and ONE <style> element, so turning Toonify off is
 * always a clean, complete removal.
 *
 * Milestone 0 uses a deliberately small, visible treatment to prove the
 * add/remove cycle. The real theme engine replaces TOONIFY_CSS in Milestone 2.
 */

export const ACTIVE_ATTRIBUTE = 'data-toonify-active';
export const STYLE_ELEMENT_ID = 'toonify-web-style';

const INK = '#1b1b2f';

// Every rule is scoped under html[data-toonify-active], so nothing applies
// unless Toonify is on. No !important, no layout properties (display,
// position, width, height, z-index, overflow) are touched.
export const TOONIFY_CSS = `
html[${ACTIVE_ATTRIBUTE}] img,
html[${ACTIVE_ATTRIBUTE}] video,
html[${ACTIVE_ATTRIBUTE}] button,
html[${ACTIVE_ATTRIBUTE}] input,
html[${ACTIVE_ATTRIBUTE}] select,
html[${ACTIVE_ATTRIBUTE}] textarea {
  border-radius: 10px;
}
html[${ACTIVE_ATTRIBUTE}] img {
  outline: 3px solid ${INK};
  outline-offset: -3px;
}
html[${ACTIVE_ATTRIBUTE}] button {
  box-shadow: 0 3px 0 ${INK};
}
`;

export function isLayerApplied(doc: Document = document): boolean {
  return (
    doc.documentElement.hasAttribute(ACTIVE_ATTRIBUTE) &&
    doc.getElementById(STYLE_ELEMENT_ID) !== null
  );
}

/** Adds the layer. Safe to call repeatedly: never creates a second <style>. */
export function applyLayer(doc: Document = document): void {
  doc.documentElement.setAttribute(ACTIVE_ATTRIBUTE, '');

  if (doc.getElementById(STYLE_ELEMENT_ID) === null) {
    const style = doc.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = TOONIFY_CSS;
    // At document_start <head> may not exist yet; <html> always does.
    (doc.head ?? doc.documentElement).append(style);
  }
}

/** Removes every trace of the layer. Safe to call when nothing is applied. */
export function removeLayer(doc: Document = document): void {
  doc.documentElement.removeAttribute(ACTIVE_ATTRIBUTE);
  doc.querySelectorAll(`#${STYLE_ELEMENT_ID}`).forEach((node) => node.remove());
}

export interface LayerGuard {
  start(): void;
  stop(): void;
}

/**
 * Some sites (single-page apps, head managers) rewrite <html> attributes or
 * replace <head> children, which would silently remove our layer. The guard
 * puts it back while Toonify is enabled.
 *
 * It watches only <html> attributes and the direct children of <html> and
 * <head>, never the whole page, so it stays cheap on busy sites. Our own
 * changes trigger it too, but isLayerApplied() is then true, so it cannot loop.
 */
export function createLayerGuard(doc: Document, isEnabled: () => boolean): LayerGuard {
  let observer: MutationObserver | null = null;
  let repairScheduled = false;

  const observeTargets = () => {
    if (observer === null) return;
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: [ACTIVE_ATTRIBUTE],
      childList: true,
    });
    if (doc.head) observer.observe(doc.head, { childList: true });
  };

  const repair = () => {
    repairScheduled = false;
    if (!isEnabled() || isLayerApplied(doc)) return;
    applyLayer(doc);
    // <head> may have been replaced, so re-attach to the current one.
    observer?.disconnect();
    observeTargets();
  };

  return {
    start() {
      if (observer !== null) return; // already running: never add a second observer
      observer = new MutationObserver(() => {
        if (repairScheduled) return; // batch bursts of mutations into one check
        repairScheduled = true;
        queueMicrotask(repair);
      });
      observeTargets();
    },
    stop() {
      observer?.disconnect();
      observer = null;
      repairScheduled = false;
    },
  };
}
