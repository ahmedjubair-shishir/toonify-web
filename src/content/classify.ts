/**
 * The classifier marks the elements a theme may style, so the CSS never
 * targets raw tags like `img` or `button`. Styling is opt-in per element:
 * anything not marked keeps the site's original look.
 *
 * Marks: data-toonify="media" | "button" | "field" | "heading".
 * Icons get their own mark, data-toonify-icon="<meaning>" (see icon-meaning.ts),
 * and only while the icon feature is on.
 */
import {
  ICON_CANDIDATES,
  ICON_MARK,
  MAX_ICON_SIZE,
  MIN_ICON_SIZE,
  iconMeaning,
  looksLikeIcon,
} from './icon-meaning';

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

/** Icons live in different places than content: aria-hidden is normal for them. */
const ICON_NO_GO_ZONE =
  '[contenteditable=""], [contenteditable="true"], [role="application"], [data-toonify-skip]';

/** The icon's meaning, or null when the element is not an icon we restyle. */
export function classifyIcon(element: Element, measure: Measure = measureRendered): string | null {
  if (element.closest(ICON_NO_GO_ZONE) || !looksLikeIcon(element)) return null;
  const { width, height } = measure(element);
  const small = Math.min(width, height);
  const large = Math.max(width, height);
  if (small < MIN_ICON_SIZE || large > MAX_ICON_SIZE) return null;
  // A 48px image is content (media), not an icon.
  if (element instanceof HTMLImageElement && small >= MIN_MEDIA_SIZE) return null;
  return iconMeaning(element);
}

export function updateIconMark(element: Element, measure: Measure = measureRendered): void {
  const meaning = classifyIcon(element, measure);
  if (meaning === null) element.removeAttribute(ICON_MARK);
  else if (element.getAttribute(ICON_MARK) !== meaning) element.setAttribute(ICON_MARK, meaning);
}

/** Checks the icons in root (root included). */
export function markIcons(root: ParentNode, measure: Measure = measureRendered): void {
  if (root instanceof Element && root.matches(ICON_CANDIDATES)) updateIconMark(root, measure);
  root.querySelectorAll(ICON_CANDIDATES).forEach((element) => updateIconMark(element, measure));
}

/** Removes every icon mark (icon feature switched off). */
export function clearIconMarks(doc: Document): void {
  doc.querySelectorAll(`[${ICON_MARK}]`).forEach((element) => element.removeAttribute(ICON_MARK));
}

/** Marks or unmarks one element to match classify(). */
export function updateMark(element: Element, measure: Measure = measureRendered): void {
  const kind = classify(element, measure);
  if (kind === null) element.removeAttribute(MARK);
  else if (element.getAttribute(MARK) !== kind) element.setAttribute(MARK, kind);
}

/** Classifies every candidate inside root (root included). */
export function markTree(
  root: ParentNode,
  measure: Measure = measureRendered,
  icons = false,
): void {
  if (root instanceof Element && root.matches(CANDIDATE_SELECTOR)) updateMark(root, measure);
  root.querySelectorAll(CANDIDATE_SELECTOR).forEach((element) => updateMark(element, measure));
  if (icons) markIcons(root, measure);
}

/** Removes every mark (used when Toonify turns off). */
export function clearMarks(doc: Document): void {
  doc.querySelectorAll(`[${MARK}]`).forEach((element) => element.removeAttribute(MARK));
  clearIconMarks(doc);
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
export interface ClassifierOptions {
  /** Also find icons (only while the icon feature is on). Read at start(). */
  icons?: () => boolean;
}

/** Attributes that only change what an icon means (e.g. play becomes pause). */
const ICON_ATTRIBUTES = ['class', 'href', 'xlink:href', 'data-icon', 'aria-label', 'title'];
const CLASSIFY_ATTRIBUTES = ['src', 'role', 'aria-hidden', 'contenteditable', 'data-toonify-skip'];

export function createClassifier(
  doc: Document,
  measure: Measure = measureRendered,
  options: ClassifierOptions = {},
): Classifier {
  let observer: MutationObserver | null = null;
  let frame: number | null = null;
  let icons = false;
  const pending = new Set<ParentNode>();
  const pendingIcons = new Set<Element>();

  const flush = () => {
    frame = null;
    for (const node of pending)
      if (node instanceof Document || node.isConnected) markTree(node, measure, icons);
    for (const element of pendingIcons) if (element.isConnected) markIcons(element, measure);
    pending.clear();
    pendingIcons.clear();
  };

  const schedule = (node: ParentNode) => {
    pending.add(node);
    frame ??= requestAnimationFrame(flush);
  };

  /**
   * An icon attribute changed. Re-check only that icon (or the icons in an
   * icon-only button), never a whole page section: some sites change classes
   * on every scroll.
   */
  const scheduleIcon = (target: Element) => {
    const svg = target.closest('svg');
    let element: Element | null = null;
    if (svg) element = svg;
    else if (target.matches(ICON_CANDIDATES)) element = target;
    else if (target.matches('button, a, [role="button"]')) element = target;
    if (element === null) return;
    pendingIcons.add(element);
    frame ??= requestAnimationFrame(flush);
  };

  // `load` does not bubble, but capture-phase listeners on the document see it.
  const onLoad = (event: Event) => {
    if (event.target instanceof HTMLImageElement) schedule(event.target);
  };

  return {
    start() {
      if (observer !== null) return;
      icons = options.icons?.() ?? false;
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'attributes') {
            if (!(record.target instanceof Element)) continue;
            if (CLASSIFY_ATTRIBUTES.includes(record.attributeName ?? '')) schedule(record.target);
            else scheduleIcon(record.target);
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
        attributeFilter: icons ? [...CLASSIFY_ATTRIBUTES, ...ICON_ATTRIBUTES] : CLASSIFY_ATTRIBUTES,
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
      pendingIcons.clear();
    },
  };
}
