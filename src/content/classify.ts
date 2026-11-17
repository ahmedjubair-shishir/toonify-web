/**
 * The classifier marks the elements a theme may style, so the CSS never
 * targets raw tags like `img` or `button`. Styling is opt-in per element:
 * anything not marked keeps the site's original look.
 *
 * Marks: data-toonify="media" | "button" | "field" | "heading".
 */

export const MARK = 'data-toonify';
export type MarkKind = 'media' | 'button' | 'field' | 'heading';

/** Smallest image we treat as content, not an icon (px, both sides). */
export const MIN_MEDIA_SIZE = 48;
/** Smallest text button we style (px). Tiny buttons are usually chips/icons. */
export const MIN_BUTTON_HEIGHT = 20;

const BUTTON_SELECTOR =
  'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';
const FIELD_SELECTOR =
  'textarea, select, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"]';
const HEADING_SELECTOR = 'h1, h2, h3, h4';
const CANDIDATE_SELECTOR = `img, ${BUTTON_SELECTOR}, ${FIELD_SELECTOR}, ${HEADING_SELECTOR}`;

/**
 * Headings whose letters are mostly Latin. The playful font only covers
 * Latin, so other scripts (Bengali, Arabic, CJK...) keep the site's font
 * instead of falling back to a different one.
 */
export function isMostlyLatin(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const latin = letters.filter((letter) => /\p{Script=Latin}/u.test(letter)).length;
  return latin / letters.length >= 0.8;
}

/**
 * Areas we never touch: rich editors, app-like widgets (maps, players,
 * canvases with their own controls), hidden content, and an opt-out
 * attribute sites or users can add.
 */
const NO_GO_ZONE =
  '[contenteditable=""], [contenteditable="true"], [role="application"], [aria-hidden="true"], [data-toonify-skip]';

export interface Size {
  width: number;
  height: number;
}
export type Measure = (element: Element) => Size;

export const measureRendered: Measure = (element) => {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
};

function visibleText(element: Element): string {
  if (element instanceof HTMLInputElement) return element.value.trim();
  return (element.textContent ?? '').trim();
}

/** Decides what an element is, or null when it should be left alone. */
export function classify(element: Element, measure: Measure = measureRendered): MarkKind | null {
  if (element.closest(NO_GO_ZONE)) return null;

  if (element instanceof HTMLImageElement) {
    // Decorative images (alt="" or role) are often icons or spacers.
    if (element.getAttribute('role') === 'presentation') return null;
    const { width, height } = measure(element);
    return width >= MIN_MEDIA_SIZE && height >= MIN_MEDIA_SIZE ? 'media' : null;
  }

  if (element.matches(BUTTON_SELECTOR)) {
    // Icon-only buttons have no visible text (just an svg or img).
    if (visibleText(element).length === 0) return null;
    // Nested buttons (role=button inside a button) are styled once, outside.
    if (element.parentElement?.closest(BUTTON_SELECTOR)) return null;
    const { height } = measure(element);
    return height >= MIN_BUTTON_HEIGHT ? 'button' : null;
  }

  if (element.matches(HEADING_SELECTOR)) {
    return isMostlyLatin(element.textContent ?? '') ? 'heading' : null;
  }

  if (element.matches(FIELD_SELECTOR)) {
    const { width, height } = measure(element);
    return width > 0 && height > 0 ? 'field' : null;
  }

  return null;
}

/** Marks or unmarks one element to match classify(). */
export function updateMark(element: Element, measure: Measure = measureRendered): void {
  const kind = classify(element, measure);
  if (kind === null) element.removeAttribute(MARK);
  else if (element.getAttribute(MARK) !== kind) element.setAttribute(MARK, kind);
}

/** Classifies every candidate inside root (root included). */
export function markTree(root: ParentNode, measure: Measure = measureRendered): void {
  if (root instanceof Element && root.matches(CANDIDATE_SELECTOR)) updateMark(root, measure);
  root.querySelectorAll(CANDIDATE_SELECTOR).forEach((element) => updateMark(element, measure));
}

/** Removes every mark (used when Toonify turns off). */
export function clearMarks(doc: Document): void {
  doc.querySelectorAll(`[${MARK}]`).forEach((element) => element.removeAttribute(MARK));
}

export interface Classifier {
  start(): void;
  stop(): void;
}

/**
 * Keeps marks up to date on dynamic pages. New content is collected and
 * classified once per animation frame, so busy sites (infinite feeds, SPAs)
 * cost one batch per frame, not one check per change. Images are re-checked
 * when they finish loading, because their size is unknown before that.
 */
export function createClassifier(doc: Document, measure: Measure = measureRendered): Classifier {
  let observer: MutationObserver | null = null;
  let frame: number | null = null;
  const pending = new Set<ParentNode>();

  const flush = () => {
    frame = null;
    for (const node of pending)
      if (node instanceof Document || node.isConnected) markTree(node, measure);
    pending.clear();
  };

  const schedule = (node: ParentNode) => {
    pending.add(node);
    frame ??= requestAnimationFrame(flush);
  };

  // `load` does not bubble, but capture-phase listeners on the document see it.
  const onLoad = (event: Event) => {
    if (event.target instanceof HTMLImageElement) schedule(event.target);
  };

  return {
    start() {
      if (observer !== null) return;
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'attributes') {
            if (record.target instanceof Element) schedule(record.target);
            continue;
          }
          record.addedNodes.forEach((node) => {
            if (node instanceof Element) schedule(node);
            // New text (e.g. a heading's words after a route change): re-check its parent.
            else if (node.parentElement) schedule(node.parentElement);
          });
        }
      });
      // Only structure and the few attributes classify() reads; never text.
      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'role', 'aria-hidden', 'contenteditable', 'data-toonify-skip'],
      });
      doc.addEventListener('load', onLoad, true);
      schedule(doc);
    },
    stop() {
      observer?.disconnect();
      observer = null;
      doc.removeEventListener('load', onLoad, true);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      pending.clear();
    },
  };
}
