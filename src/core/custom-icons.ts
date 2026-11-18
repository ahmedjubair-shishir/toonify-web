/**
 * Custom icon sets (owner request, 19 Nov 2026): the user adds an icon set
 * from a link, Toonify downloads it once, keeps it in the browser and offers
 * it next to the built-in sets. Saved sets work on every site and can be
 * removed. Pages never contact the link: the icons travel inside our CSS.
 *
 * Two kinds of link:
 * - An Iconify set (200+ free sets): "mdi", or a link such as
 *   https://icon-sets.iconify.design/mdi/ - one request fetches all icons.
 * - Any CDN folder of SVG files, with {name} where the icon name goes:
 *   https://cdn.jsdelivr.net/npm/ionicons@7/dist/svg/{name}.svg
 *
 * Toonify knows what an icon means (search, menu...), not what each set calls
 * it, so it tries the usual names for each meaning (below) and keeps the
 * first one the set has.
 */
import { storage } from '#imports';
import { ICON_MEANINGS, type IconMeaning } from './icons';
import { customSetRef, type CustomIconSetRef } from './icons';
import { updateSettings } from './settings';

export interface CustomIconSet {
  /** Short id, unique among saved sets (used as "custom:<id>"). */
  id: string;
  name: string;
  /** What the user entered, normalised (for display and re-download). */
  source: string;
  /** Clean SVG markup per meaning; meanings the set lacks keep site icons. */
  icons: Partial<Record<IconMeaning, string>>;
  addedAt: number;
}

export type IconSource =
  | {
      kind: 'iconify';
      prefix: string;
      /** Shown when a link was matched to Iconify. */ note?: string;
    }
  | { kind: 'template'; url: string };

/** Limits that keep storage small and pages fast. */
export const MAX_CUSTOM_SETS = 12;
const MAX_ICON_BYTES = 20_000;
const MAX_DOWNLOAD_BYTES = 200_000;

/** Usual names for each meaning across popular sets (Lucide, Tabler, Phosphor, MDI, Font Awesome, Material, Ionicons, Bootstrap). */
const BASE_NAMES: Readonly<Record<IconMeaning, readonly string[]>> = {
  search: ['search', 'magnifying-glass', 'magnify', 'search-outline', 'zoom'],
  menu: ['menu', 'bars', 'list', 'menu-2', 'hamburger', 'menu-outline', 'navicon'],
  close: ['close', 'x', 'xmark', 'times', 'x-lg', 'close-outline', 'cross'],
  home: ['home', 'house', 'home-outline', 'house-door'],
  user: ['user', 'person', 'account', 'person-outline', 'user-circle', 'account-circle'],
  settings: ['settings', 'gear', 'cog', 'settings-outline', 'gear-six'],
  cart: ['cart', 'shopping-cart', 'cart-shopping', 'cart-outline', 'basket'],
  heart: ['heart', 'favorite', 'heart-outline', 'favorite-border'],
  star: ['star', 'star-outline', 'star-border'],
  share: ['share', 'share-2', 'share-network', 'share-variant', 'share-social', 'share-outline'],
  bell: ['bell', 'notifications', 'bell-outline', 'notification', 'notifications-outline'],
  play: ['play', 'player-play', 'play-arrow', 'play-outline', 'play-fill'],
  pause: ['pause', 'player-pause', 'pause-outline', 'pause-fill'],
  download: ['download', 'download-simple', 'download-outline', 'file-download'],
  upload: ['upload', 'upload-simple', 'upload-outline', 'file-upload'],
  mail: ['mail', 'email', 'envelope', 'envelope-simple', 'mail-outline', 'email-outline'],
  plus: ['plus', 'add', 'add-outline'],
  minus: ['minus', 'remove', 'remove-outline', 'dash'],
  trash: ['trash', 'trash-2', 'delete', 'trash-can', 'trash-outline', 'delete-outline'],
  edit: ['edit', 'pencil', 'pencil-simple', 'pen', 'create', 'pencil-outline'],
  check: ['check', 'checkmark', 'done', 'check-lg'],
  bookmark: ['bookmark', 'bookmark-simple', 'bookmark-outline'],
  info: [
    'info',
    'information',
    'info-circle',
    'circle-info',
    'information-circle',
    'information-outline',
  ],
  help: [
    'help',
    'help-circle',
    'circle-question-mark',
    'question',
    'circle-question',
    'question-circle',
    'help-circle-outline',
  ],
  globe: ['globe', 'world', 'earth', 'language', 'globe-outline'],
  calendar: ['calendar', 'calendar-blank', 'calendar-month', 'calendar-outline', 'event'],
  filter: ['filter', 'funnel', 'filter-list', 'filter-outline', 'filter-variant'],
  more: [
    'more',
    'ellipsis',
    'dots',
    'dots-three',
    'dots-horizontal',
    'more-horiz',
    'ellipsis-horizontal',
    'three-dots',
  ],
  lock: ['lock', 'lock-closed', 'lock-outline', 'padlock'],
  logout: [
    'logout',
    'log-out',
    'sign-out',
    'right-from-bracket',
    'log-out-outline',
    'box-arrow-right',
  ],
  camera: ['camera', 'photo-camera', 'camera-outline'],
  image: ['image', 'photo', 'picture', 'image-outline', 'images'],
  link: ['link', 'link-2', 'link-variant', 'link-outline'],
  phone: ['phone', 'call', 'telephone', 'call-outline'],
  chat: [
    'chat',
    'message-circle',
    'chat-circle',
    'message',
    'comment',
    'chatbubble',
    'chatbubble-outline',
    'chat-outline',
  ],
  'arrow-left': ['arrow-left', 'arrow-back', 'arrow-back-outline', 'left-arrow'],
  'arrow-right': ['arrow-right', 'arrow-forward', 'arrow-forward-outline', 'right-arrow'],
  'chevron-down': [
    'chevron-down',
    'caret-down',
    'angle-down',
    'expand-more',
    'chevron-down-outline',
  ],
  'chevron-up': ['chevron-up', 'caret-up', 'angle-up', 'expand-less', 'chevron-up-outline'],
  'chevron-left': [
    'chevron-left',
    'caret-left',
    'angle-left',
    'chevron-back',
    'chevron-back-outline',
  ],
  'chevron-right': [
    'chevron-right',
    'caret-right',
    'angle-right',
    'chevron-forward',
    'chevron-forward-outline',
  ],
  external: [
    'external-link',
    'open-in-new',
    'arrow-square-out',
    'arrow-up-right-from-square',
    'box-arrow-up-right',
    'open-outline',
  ],
  refresh: [
    'refresh',
    'refresh-cw',
    'arrows-clockwise',
    'rotate-right',
    'reload',
    'refresh-outline',
    'arrow-clockwise',
  ],
  'thumbs-up': ['thumbs-up', 'thumb-up', 'like', 'thumbs-up-outline', 'hand-thumbs-up'],
  location: [
    'location',
    'map-pin',
    'map-marker',
    'location-dot',
    'location-on',
    'location-outline',
    'geo-alt',
    'place',
  ],
  eye: ['eye', 'visibility', 'eye-outline', 'view'],
  volume: ['volume', 'volume-2', 'volume-high', 'volume-up', 'speaker-high', 'volume-high-outline'],
  mic: ['mic', 'microphone', 'mic-outline'],
};

/** More names, e.g. Hugeicons (cancel, favourite, tick) and similar sets. */
const EXTRA_NAMES: Partial<Record<IconMeaning, readonly string[]>> = {
  close: ['cancel'],
  heart: ['favourite'],
  minus: ['minus-sign'],
  edit: ['pencil-edit'],
  check: ['tick'],
  more: ['more-horizontal'],
  chat: ['bubble-chat'],
  external: ['link-square'],
};

export const CANDIDATE_NAMES: Readonly<Record<IconMeaning, readonly string[]>> = Object.fromEntries(
  ICON_MEANINGS.map((meaning) => [
    meaning,
    [...BASE_NAMES[meaning], ...(EXTRA_NAMES[meaning] ?? [])],
  ]),
) as unknown as Record<IconMeaning, readonly string[]>;

/**
 * Popular sets on Iconify, offered as one-click choices in the popup. Their
 * own links (icon fonts, CSS, websites) can't be used directly - fonts hold
 * no SVG drawings - so those links are matched to the same set on Iconify.
 */
export const POPULAR_ICONIFY_SETS: readonly {
  prefix: string;
  name: string;
  match: readonly string[];
}[] = [
  { prefix: 'mdi', name: 'Material Design', match: ['materialdesignicons', '@mdi'] },
  { prefix: 'hugeicons', name: 'Hugeicons', match: ['hugeicons'] },
  { prefix: 'fa6-solid', name: 'Font Awesome', match: ['fontawesome', 'font-awesome'] },
  { prefix: 'ri', name: 'Remix', match: ['remixicon'] },
  { prefix: 'bi', name: 'Bootstrap', match: ['bootstrap-icons'] },
  { prefix: 'heroicons', name: 'Heroicons', match: ['heroicons'] },
  { prefix: 'iconoir', name: 'Iconoir', match: ['iconoir'] },
  { prefix: 'carbon', name: 'Carbon', match: ['carbon-icons', '@carbon/icons'] },
  { prefix: 'ion', name: 'Ionicons', match: ['ionicons'] },
  { prefix: 'bx', name: 'Boxicons', match: ['boxicons'] },
  {
    prefix: 'material-symbols',
    name: 'Material Symbols',
    match: ['material+symbols', 'material-symbols'],
  },
];

/** The Iconify set for a known icon library link (e.g. a Hugeicons font CSS). */
export function knownSetForLink(link: string): (typeof POPULAR_ICONIFY_SETS)[number] | null {
  const text = link.toLowerCase();
  return POPULAR_ICONIFY_SETS.find((set) => set.match.some((word) => text.includes(word))) ?? null;
}

const ICONIFY_HOSTS = new Set(['icon-sets.iconify.design', 'iconify.design', 'api.iconify.design']);
const PREFIX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Reads what the user entered. Plain `https` only (plain http is allowed for
 * localhost, for testing), so nobody on the network can swap the icons.
 */
export function parseIconSource(input: string): IconSource | { error: string } {
  const text = input.trim();
  if (text === '') return { error: 'Pick a set above or paste a link.' };
  if (PREFIX.test(text)) return { kind: 'iconify', prefix: text };
  let url: URL;
  try {
    url = new URL(text.replaceAll('{name}', '__NAME__'));
  } catch {
    return { error: 'That is not a set name or a link. Pick a set above, or paste a link.' };
  }
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    return { error: 'Use a secure link (https://).' };
  if (ICONIFY_HOSTS.has(url.hostname)) {
    const prefix = url.pathname
      .split('/')
      .find((part) => part !== '')
      ?.replace(/\.(json|svg)$/, '');
    if (prefix && PREFIX.test(prefix)) return { kind: 'iconify', prefix };
    return { error: 'Open an icon set on Iconify and copy its link.' };
  }
  if (!text.includes('{name}')) {
    const known = knownSetForLink(text);
    if (known)
      return {
        kind: 'iconify',
        prefix: known.prefix,
        note: `${known.name} found. Toonify uses its SVG version from Iconify.`,
      };
    if (/\.(css|woff2?|ttf|otf|eot|js)(\?|#|$)/i.test(url.pathname))
      return {
        error:
          'This is an icon font or stylesheet, which has no pictures Toonify can use. Pick a set above, or find yours on iconify.design and paste its link.',
      };
    return {
      error:
        "Toonify can't read icons from this link. Pick a set above, paste an iconify.design link, or use a link to SVG files with {name} where the icon name goes.",
    };
  }
  return { kind: 'template', url: url.href.replaceAll('__NAME__', '{name}') };
}

/** A readable default name: the Iconify prefix or the link's package/host. */
export function suggestName(source: IconSource): string {
  if (source.kind === 'iconify')
    return POPULAR_ICONIFY_SETS.find((set) => set.prefix === source.prefix)?.name ?? source.prefix;
  const url = new URL(source.url.replaceAll('{name}', 'x'));
  const npm = /\/npm\/(@?[^@/]+(?:\/[^@/]+)?)/.exec(url.pathname)?.[1];
  return npm ?? url.hostname;
}

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'defs',
  'clippath',
  'mask',
  'lineargradient',
  'radialgradient',
  'stop',
  'title',
  'desc',
  'symbol',
]);

/**
 * Keeps only drawing elements and attributes: no scripts, links, images,
 * foreign content or event handlers. Returns null for anything unusable.
 * (The result is only ever shown as a mask image, which can't run code;
 * this is a second guard and keeps stored data small.)
 */
export function sanitizeSvg(text: string, parser: DOMParser = new DOMParser()): string | null {
  if (text.length > MAX_DOWNLOAD_BYTES) return null;
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || doc.querySelector('parsererror')) return null;
  const clean = (element: Element) => {
    for (const child of [...element.children]) {
      if (!ALLOWED_ELEMENTS.has(child.localName.toLowerCase())) child.remove();
      else clean(child);
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const external = name.endsWith('href') || /url\(\s*['"]?(?!#)/.test(value);
      if (name.startsWith('on') || name === 'style' || name === 'class' || external)
        element.removeAttribute(attribute.name);
    }
  };
  clean(root);
  // A size-free icon: the viewBox decides its shape, the page decides its size.
  if (!root.hasAttribute('viewBox')) {
    const width = parseFloat(root.getAttribute('width') ?? '24') || 24;
    const height = parseFloat(root.getAttribute('height') ?? '24') || 24;
    root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  root.removeAttribute('width');
  root.removeAttribute('height');
  if (root.children.length === 0) return null;
  const markup = new XMLSerializer()
    .serializeToString(root)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/currentColor/gi, '#000');
  return markup.length <= MAX_ICON_BYTES ? markup : null;
}

export interface DownloadResult {
  icons: Partial<Record<IconMeaning, string>>;
  found: number;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const readText = async (response: Response) => {
  const text = await response.text();
  return text.length > MAX_DOWNLOAD_BYTES * 10 ? '' : text;
};

interface IconifyIcon {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}
interface IconifyResponse {
  prefix?: string;
  icons?: Record<string, IconifyIcon>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
}

async function downloadIconify(
  prefix: string,
  fetcher: Fetch,
  parser: DOMParser,
): Promise<DownloadResult> {
  // Some sets number their icons (Hugeicons: search-01), so ask for both.
  const variants = (name: string) => [name, `${name}-01`];
  const names = [...new Set(Object.values(CANDIDATE_NAMES).flat().flatMap(variants))];
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += 80) chunks.push(names.slice(i, i + 80));
  const icons: Record<string, IconifyIcon> = {};
  const aliases: Record<string, string> = {};
  let width = 24;
  let height = 24;
  for (const chunk of chunks) {
    let response: Response;
    try {
      response = await fetcher(
        `https://api.iconify.design/${prefix}.json?icons=${chunk.join(',')}`,
        { credentials: 'omit' },
      );
    } catch {
      throw new Error("Couldn't reach Iconify. Check your internet connection and try again.");
    }
    if (response.status === 404) throw new Error(`Iconify has no icon set called "${prefix}".`);
    if (!response.ok) throw new Error('Iconify did not answer. Please try again.');
    const data = JSON.parse(await readText(response)) as IconifyResponse | 404;
    if (data === 404 || typeof data !== 'object')
      throw new Error(`Iconify has no icon set called "${prefix}".`);
    Object.assign(icons, data.icons ?? {});
    for (const [name, alias] of Object.entries(data.aliases ?? {})) aliases[name] = alias.parent;
    width = data.width ?? width;
    height = data.height ?? height;
  }
  const result: DownloadResult = { icons: {}, found: 0 };
  for (const meaning of ICON_MEANINGS) {
    for (const name of CANDIDATE_NAMES[meaning].flatMap(variants)) {
      const icon = icons[name] ?? icons[aliases[name] ?? ''];
      if (!icon) continue;
      const box = `${icon.left ?? 0} ${icon.top ?? 0} ${icon.width ?? width} ${icon.height ?? height}`;
      const svg = sanitizeSvg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${icon.body}</svg>`,
        parser,
      );
      if (svg) {
        result.icons[meaning] = svg;
        result.found++;
        break;
      }
    }
  }
  return result;
}

async function downloadTemplate(
  template: string,
  fetcher: Fetch,
  parser: DOMParser,
  onProgress?: (done: number, total: number) => void,
): Promise<DownloadResult> {
  const result: DownloadResult = { icons: {}, found: 0 };
  let blocked = 0;
  const findOne = async (meaning: IconMeaning) => {
    for (const name of CANDIDATE_NAMES[meaning]) {
      let response: Response;
      try {
        response = await fetcher(template.replaceAll('{name}', encodeURIComponent(name)), {
          credentials: 'omit',
        });
      } catch {
        blocked++; // network error or the CDN does not allow extensions (CORS)
        return;
      }
      if (!response.ok) continue;
      const svg = sanitizeSvg(await readText(response), parser);
      if (svg) {
        result.icons[meaning] = svg;
        result.found++;
        return;
      }
    }
  };
  // A few meanings at a time: polite to the CDN, still quick.
  let done = 0;
  const queue = [...ICON_MEANINGS];
  const worker = async () => {
    for (let meaning = queue.shift(); meaning; meaning = queue.shift()) {
      await findOne(meaning);
      onProgress?.(++done, ICON_MEANINGS.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (result.found === 0 && blocked > 0)
    throw new Error("Couldn't reach that link. The CDN may not allow downloads from extensions.");
  return result;
}

/** Downloads every icon Toonify can use from a source. */
export async function downloadIconSet(
  source: IconSource,
  options: {
    fetcher?: Fetch;
    parser?: DOMParser;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<DownloadResult> {
  const fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
  const parser = options.parser ?? new DOMParser();
  const result =
    source.kind === 'iconify'
      ? await downloadIconify(source.prefix, fetcher, parser)
      : await downloadTemplate(source.url, fetcher, parser, options.onProgress);
  if (result.found === 0)
    throw new Error('No usable icons found there. Check the link and the {name} part.');
  return result;
}

// ---------- Saved sets ----------

const setsItem = storage.defineItem<unknown>('local:customIconSets', { fallback: [] });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Accepts only well-formed saved sets (storage can be edited by hand). */
export function parseCustomIconSets(raw: unknown): CustomIconSet[] {
  if (!Array.isArray(raw)) return [];
  const sets: CustomIconSet[] = [];
  for (const value of raw) {
    if (!isRecord(value) || !isRecord(value.icons)) continue;
    const { id, name, source, addedAt } = value;
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(id)) continue;
    if (typeof name !== 'string' || typeof source !== 'string') continue;
    const icons: Partial<Record<IconMeaning, string>> = {};
    for (const meaning of ICON_MEANINGS) {
      const svg = value.icons[meaning];
      if (typeof svg === 'string' && svg.startsWith('<svg') && svg.length <= MAX_ICON_BYTES)
        icons[meaning] = svg;
    }
    sets.push({
      id,
      name: name.slice(0, 40),
      source: source.slice(0, 500),
      icons,
      addedAt: typeof addedAt === 'number' ? addedAt : 0,
    });
  }
  return sets.slice(0, MAX_CUSTOM_SETS);
}

export async function getCustomIconSets(): Promise<CustomIconSet[]> {
  return parseCustomIconSets(await setsItem.getValue());
}

export function watchCustomIconSets(callback: (sets: CustomIconSet[]) => void): () => void {
  return setsItem.watch((value) => callback(parseCustomIconSets(value)));
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'set';

/** Saves a downloaded set and returns its reference ("custom:<id>"). */
export async function saveCustomIconSet(
  name: string,
  source: IconSource,
  result: DownloadResult,
): Promise<CustomIconSetRef> {
  const sets = await getCustomIconSets();
  if (sets.length >= MAX_CUSTOM_SETS)
    throw new Error(`You can keep up to ${MAX_CUSTOM_SETS} custom sets. Remove one first.`);
  const base = slug(name);
  let id = base;
  for (let n = 2; sets.some((set) => set.id === id); n++) id = `${base}-${n}`;
  const set: CustomIconSet = {
    id,
    name: name.trim().slice(0, 40) || base,
    source: source.kind === 'iconify' ? `iconify:${source.prefix}` : source.url,
    icons: result.icons,
    addedAt: Date.now(),
  };
  await setsItem.setValue([...sets, set]);
  return customSetRef(id);
}

/** Removes a saved set. Sites that used it go back to their own icons. */
export async function removeCustomIconSet(id: string): Promise<void> {
  const sets = await getCustomIconSets();
  await setsItem.setValue(sets.filter((set) => set.id !== id));
  const ref = customSetRef(id);
  await updateSettings((settings) => {
    for (const site of Object.values(settings.sites)) {
      if (site.iconSet === ref) delete site.iconSet;
    }
  });
}
