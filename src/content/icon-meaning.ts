/**
 * Works out what an icon means from the names sites already give it:
 * class names (fa-magnifying-glass, bi-x-lg), sprite links (#icon-search),
 * data-icon, Material ligature text ("search"), alt / aria-label / title,
 * or the label of the icon-only button around it. Nothing is guessed from
 * pixels. Unknown icons get "other": they keep their drawing (looks still apply).
 */
import { ICON_MEANINGS, type IconMeaning } from '@/core/icons';

export const ICON_MARK = 'data-toonify-icon';
export type IconMark = IconMeaning | 'other';

/** Word (or two joined words) -> meaning, with a weight: specific words beat vague ones. */
const WORDS: Readonly<Record<string, readonly [IconMeaning, number]>> = (() => {
  const table: Record<string, readonly [IconMeaning, number]> = {};
  const add = (meaning: IconMeaning, weight: number, words: string) => {
    for (const word of words.split(' ')) table[word] = [meaning, weight];
  };
  // weight 3: two-word names (arrow-left); 2: clear names; 1: vague words.
  add('search', 2, 'search magnifier magnifying magnify loupe zoom-in');
  add('menu', 2, 'menu hamburger bars navicon burger menu-2 list-ul');
  add('close', 2, 'close times xmark x cancel dismiss x-lg close-x');
  add('home', 2, 'home house homepage');
  add('user', 2, 'user person account profile avatar people-circle user-circle');
  add('settings', 2, 'settings gear cog cogs preferences sliders configure');
  add('cart', 2, 'cart basket shopping-cart shopping-bag checkout');
  add('heart', 2, 'heart favorite favourite favorites love');
  add('star', 2, 'star stars rating rate');
  add('share', 2, 'share share-alt forward-share');
  add('bell', 2, 'bell notification notifications notify');
  add('play', 2, 'play play-arrow play-circle');
  add('pause', 2, 'pause');
  add('download', 2, 'download downloads');
  add('upload', 2, 'upload uploads');
  add('mail', 2, 'mail email envelope inbox e-mail');
  add('plus', 1, 'plus add create new');
  add('minus', 1, 'minus subtract');
  add('trash', 2, 'trash delete bin garbage remove trash-can');
  add('edit', 2, 'edit pencil pen compose rename');
  add('check', 2, 'check checkmark tick done');
  add('bookmark', 2, 'bookmark bookmarks');
  add('info', 2, 'info information about');
  add('help', 2, 'help question faq support');
  add('globe', 2, 'globe world earth language languages translate');
  add('calendar', 2, 'calendar date event events schedule');
  add('filter', 2, 'filter filters funnel');
  add('more', 1, 'more ellipsis dots kebab overflow options more-vert more-horiz');
  add('lock', 2, 'lock locked padlock secure');
  add('logout', 3, 'logout signout log-out sign-out exit');
  add('camera', 2, 'camera');
  add('image', 2, 'image images picture photo photos gallery');
  add('link', 2, 'link chain hyperlink');
  add('phone', 2, 'phone call telephone');
  add('chat', 1, 'chat message messages comment comments bubble forum reply');
  add('arrow-left', 3, 'arrow-left back arrow-back go-back previous prev');
  add('arrow-right', 3, 'arrow-right arrow-forward next');
  add('chevron-down', 3, 'chevron-down caret-down angle-down expand-more dropdown');
  add('chevron-up', 3, 'chevron-up caret-up angle-up expand-less');
  add('chevron-left', 3, 'chevron-left caret-left angle-left navigate-before');
  add('chevron-right', 3, 'chevron-right caret-right angle-right navigate-next');
  add('external', 3, 'external external-link open-in-new launch');
  add('refresh', 2, 'refresh reload sync arrows-rotate rotate-right');
  add('thumbs-up', 3, 'thumbs-up thumb-up like');
  add('location', 2, 'location map-pin pin marker place location-on location-dot');
  add('eye', 2, 'eye view visibility show preview');
  add('volume', 2, 'volume sound speaker audio volume-up volume-high');
  add('mic', 2, 'mic microphone voice');
  return table;
})();

/** Single letters are only trusted in icon names (class, sprite), never in labels. */
const NAME_ONLY = new Set(['x']);

/** Splits "fa-solid fa-MagnifyingGlass", "#icon_search" etc. into lowercase words. */
export function words(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/** Best meaning for a piece of text, or null. Longer names (open-in-new) win over single words. */
export function meaningOf(text: string, fromLabel = false): IconMeaning | null {
  const list = words(text);
  if (fromLabel && list.length > 4) return null; // a sentence, not a name
  let best: readonly [IconMeaning, number] | null = null;
  const consider = (key: string, bonus: number) => {
    if (fromLabel && NAME_ONLY.has(key)) return;
    const hit = WORDS[key];
    if (hit && (best === null || hit[1] + bonus > best[1])) best = [hit[0], hit[1] + bonus];
  };
  for (let i = 0; i < list.length; i++) {
    const word = list[i] ?? '';
    if (i + 2 < list.length) consider(`${word}-${list[i + 1] ?? ''}-${list[i + 2] ?? ''}`, 2);
    if (i + 1 < list.length) consider(`${word}-${list[i + 1] ?? ''}`, 1);
    consider(word, 0);
  }
  return best === null ? null : (best as readonly [IconMeaning, number])[0];
}

const ICON_CLASS =
  /(^|[\s_-])(icon|icons|fa|fas|far|fab|bi|ti|ph|mdi|glyphicon|material|lucide|feather)([\s_-]|$)/i;
const LIGATURE_CLASS = /material-(icons|symbols)/i;

/** Where an icon's name can be found, most reliable first. */
function nameSources(element: Element): string[] {
  const sources: string[] = [];
  const add = (value: string | null | undefined) => {
    if (value) sources.push(value);
  };
  add(element.getAttribute('data-icon'));
  add(element.getAttribute('data-lucide'));
  add(element.getAttribute('icon'));
  if (LIGATURE_CLASS.test(element.getAttribute('class') ?? '')) add(element.textContent);
  add(element.getAttribute('class'));
  if (element.localName === 'svg') {
    element.querySelectorAll('use').forEach((use) => {
      add(use.getAttribute('href') ?? use.getAttribute('xlink:href'));
    });
  }
  if (element instanceof HTMLImageElement) {
    const file = element.getAttribute('src')?.split(/[?#]/)[0]?.split('/').pop();
    add(file?.replace(/\.(svg|png|gif|webp|jpe?g)$/i, ''));
  }
  return sources;
}

/** Human labels: on the icon, or on the icon-only button or link around it. */
function labelSources(element: Element): string[] {
  const sources: string[] = [];
  const add = (value: string | null | undefined) => {
    if (value?.trim()) sources.push(value);
  };
  add(element.getAttribute('aria-label'));
  add(element.getAttribute('title'));
  add(element.getAttribute('alt'));
  if (element.localName === 'svg') add(element.querySelector('title')?.textContent);
  const control = element.parentElement?.closest('button, a, [role="button"], label');
  if (control && (control.textContent ?? '').trim().length === 0) {
    add(control.getAttribute('aria-label'));
    add(control.getAttribute('title'));
  }
  return sources;
}

/** The icon's meaning, or "other" when its name is unknown. */
export function iconMeaning(element: Element): IconMark {
  for (const source of nameSources(element)) {
    const meaning = meaningOf(source);
    if (meaning) return meaning;
  }
  for (const source of labelSources(element)) {
    const meaning = meaningOf(source, true);
    if (meaning) return meaning;
  }
  return 'other';
}

/** Smallest and largest icon size (px). Bigger pictures are media or artwork. */
export const MIN_ICON_SIZE = 8;
export const MAX_ICON_SIZE = 48;

export const ICON_CANDIDATES =
  'svg, img, i, span[class*="icon" i], span[class*="material-symbols"], span[class*="glyph" i]';

/** Is this element an icon we may restyle? (Size is checked separately.) */
export function looksLikeIcon(element: Element): boolean {
  const name = element.localName;
  if (name === 'svg') {
    // Only outer svgs; never our own filter holder.
    return element.parentElement?.closest('svg') == null && element.id !== 'toonify-web-filters';
  }
  if (name === 'img') return true;
  if (element.childElementCount > 0) return false;
  const className = element.getAttribute('class') ?? '';
  if (LIGATURE_CLASS.test(className)) return true;
  // Font icons are empty elements; an <i> with words is italic text.
  if ((element.textContent ?? '').trim().length > 0) return false;
  return name === 'i'
    ? className.length > 0
    : ICON_CLASS.test(className) || /icon/i.test(className);
}

export const isKnownMeaning = (value: string): value is IconMeaning =>
  (ICON_MEANINGS as readonly string[]).includes(value);
