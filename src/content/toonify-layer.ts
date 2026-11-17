import { clearMarks } from './classify';
import {
  FILTER_ELEMENT_ID,
  createFilterElement,
  filterKey,
  hasFilters,
  type FilterSet,
} from './image-filter';

/**
 * The Toonify "layer": everything we add to a web page lives behind
 * attributes on <html> (active + light/dark scheme), ONE <style> element,
 * ONE hidden <svg> with filters (when a style or effect needs them) and the
 * classifier's per-element marks, so turning Toonify off is always a clean,
 * complete removal. The CSS itself comes from the theme engine.
 */

export const ACTIVE_ATTRIBUTE = 'data-toonify-active';
export const SCHEME_ATTRIBUTE = 'data-toonify-scheme';
export const STYLE_ELEMENT_ID = 'toonify-web-style';

/** What a theme (plus effects) puts on the page. */
export interface LayerContent {
  css: string;
  filters: FilterSet;
}

const needsFilter = (css: string | null) => (css ?? '').includes('url(#toonify-web-');

export function isLayerApplied(doc: Document): boolean {
  const style = doc.getElementById(STYLE_ELEMENT_ID);
  return (
    doc.documentElement.hasAttribute(ACTIVE_ATTRIBUTE) &&
    style !== null &&
    (!needsFilter(style.textContent) || doc.getElementById(FILTER_ELEMENT_ID) !== null)
  );
}

/**
 * Adds the layer with the given theme CSS. Safe to call repeatedly: never
 * creates a second <style>, and swaps the CSS in place when the theme changes.
 */
export function applyLayer(doc: Document, { css, filters }: LayerContent): void {
  doc.documentElement.setAttribute(ACTIVE_ATTRIBUTE, '');

  // Image filter first, so the CSS never points at a missing filter.
  const svg = doc.getElementById(FILTER_ELEMENT_ID);
  if (!hasFilters(filters)) {
    svg?.remove();
  } else if (svg?.getAttribute('data-key') !== filterKey(filters)) {
    svg?.remove();
    // Child of <html>, not <body>: apps that replace <body> keep it.
    doc.documentElement.append(createFilterElement(doc, filters));
  }

  const existing = doc.getElementById(STYLE_ELEMENT_ID);
  if (existing === null) {
    const style = doc.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = css;
    // At document_start <head> may not exist yet; <html> always does.
    (doc.head ?? doc.documentElement).append(style);
  } else if (existing.textContent !== css) {
    existing.textContent = css;
  }
}

/** Removes every trace of the layer. Safe to call when nothing is applied. */
export function removeLayer(doc: Document): void {
  doc.documentElement.removeAttribute(ACTIVE_ATTRIBUTE);
  doc.documentElement.removeAttribute(SCHEME_ATTRIBUTE);
  doc
    .querySelectorAll(`#${STYLE_ELEMENT_ID}, #${FILTER_ELEMENT_ID}`)
    .forEach((node) => node.remove());
  clearMarks(doc);
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
export function createLayerGuard(
  doc: Document,
  isEnabled: () => boolean,
  getContent: () => LayerContent,
): LayerGuard {
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
    applyLayer(doc, getContent());
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
