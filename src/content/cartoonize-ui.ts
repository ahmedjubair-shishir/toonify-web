import type { AiTool } from '@/core/ai-tools';
import type { CartoonizeResult } from '@/core/messaging';
import { MARK } from './classify';

/**
 * In-page "Cartoonize" chip and AI consent dialog (Figma: Components > Image
 * Action Chip, Onboarding & Consent > AI consent).
 *
 * Everything lives in ONE closed shadow root on a host element, so site CSS
 * cannot restyle it and our CSS cannot leak into the page. Swapped images
 * keep their original src/srcset in memory and are restored on undo, when
 * Toonify turns off for the site, and when the extension unloads.
 */

export const UI_HOST_TAG = 'toonify-web-ui';
export const CARTOON_ATTRIBUTE = 'data-toonify-cartoon';

export interface CartoonizeDeps {
  /** The AI tool picked in the popup (kept current by the content script). */
  currentTool: () => AiTool;
  /** Style instruction for this site's chosen style. */
  stylePrompt: () => string;
  hasConsent: () => Promise<boolean>;
  giveConsent: () => Promise<void>;
  requestCartoon: (image: {
    imageUrl: string;
    width: number;
    height: number;
  }) => Promise<CartoonizeResult>;
  /** Account handoff: open the AI app in a new tab. */
  openAiApp: (toolId: string) => Promise<boolean>;
  /** Account handoff: get image bytes the page won't share (no CORS). */
  fetchImage: (
    url: string,
  ) => Promise<{ ok: true; mimeType: string; base64: string } | { ok: false }>;
}

const MAX_COPY_SIDE = 2048;

const base64ToBlob = (base64: string, type: string) =>
  new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], { type });

/**
 * PNG copy of a page image (the clipboard only takes PNG). Tries a CORS
 * reload first; if the image's server doesn't allow that, asks the
 * background to download it. Large images are scaled down.
 */
async function imageToPng(image: HTMLImageElement, deps: CartoonizeDeps): Promise<Blob> {
  const src = image.currentSrc || image.src;
  let source: ImageBitmap;
  try {
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.src = src;
    await probe.decode();
    source = await createImageBitmap(probe);
  } catch {
    const fetched = await deps.fetchImage(src);
    if (!fetched.ok) throw new Error('image not readable');
    source = await createImageBitmap(base64ToBlob(fetched.base64, fetched.mimeType));
  }
  const scale = Math.min(1, MAX_COPY_SIDE / Math.max(source.width, source.height));
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(source.width * scale)),
    Math.max(1, Math.round(source.height * scale)),
  );
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.convertToBlob({ type: 'image/png' });
}

interface Swap {
  src: string | null;
  srcset: string | null;
  sizes: string | null;
  blobUrl: string;
}

type ChipState = 'idle' | 'busy' | 'done' | 'error';

/** Lucide icons (ISC), built with DOM calls, never from HTML strings. */
const ICONS = {
  sparkles: [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    'M20 3v4',
    'M22 5h-4',
  ],
  undo: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
};

function icon(doc: Document, paths: string[]): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(NS, 'svg');
  for (const [key, value] of Object.entries({
    viewBox: '0 0 24 24',
    width: '16',
    height: '16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  })) {
    svg.setAttribute(key, value);
  }
  for (const d of paths) {
    const path = doc.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

const CSS = `
:host { all: initial; }
.chip {
  position: fixed; z-index: 2147483647; display: none; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px 0 10px; border: 0; border-radius: 999px;
  font: 500 13px/1 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #ffffff; background: #6236f5; box-shadow: 0 2px 8px rgba(20, 16, 40, 0.28);
  cursor: pointer; white-space: nowrap;
}
.chip[data-visible="true"] { display: inline-flex; }
.chip:hover { background: #5229e0; }
.chip:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; box-shadow: 0 0 0 4px #6236f5; }
.chip[data-state="busy"] { cursor: progress; background: #4a3a8f; }
.chip[data-state="done"] { color: #1b1b2f; background: #ffffff; }
.chip[data-state="error"] { color: #1b1b2f; background: #ffe7ea; max-width: 280px; white-space: normal; height: auto; padding: 8px 12px; line-height: 1.3; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }

.hint {
  position: fixed; z-index: 2147483647; display: none; width: 300px; padding: 14px 16px; border-radius: 14px;
  font: 400 13px/1.45 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1b1b2f; background: #ffffff; box-shadow: 0 8px 28px rgba(20, 16, 40, 0.28);
}
.hint[data-visible="true"] { display: block; }
.hint strong { display: block; margin-bottom: 4px; font-size: 14px; font-weight: 600; }
.hint p { margin: 0 0 10px; color: #4a4860; }
.hint .row { display: flex; gap: 8px; justify-content: flex-end; }
.hint button { height: 32px; padding: 0 12px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
.hint .secondary { border: 1px solid #d6d4e0; color: #1b1b2f; background: #ffffff; }
.hint .primary { border: 0; color: #ffffff; background: #6236f5; }
.hint button:focus-visible { outline: 2px solid #6236f5; outline-offset: 2px; }

dialog {
  width: min(400px, calc(100vw - 32px)); padding: 24px; border: 0; border-radius: 16px;
  font: 400 14px/1.5 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1b1b2f; background: #ffffff; box-shadow: 0 16px 48px rgba(20, 16, 40, 0.3);
}
dialog::backdrop { background: rgba(20, 16, 40, 0.45); }
h2 { margin: 0 0 8px; font-size: 18px; line-height: 1.3; font-weight: 600; }
ul { margin: 12px 0 20px; padding-left: 18px; color: #4a4860; }
li { margin: 4px 0; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.actions button {
  height: 36px; padding: 0 16px; border-radius: 10px; font: 500 14px/1 inherit; font-family: inherit; cursor: pointer;
}
.secondary { border: 1px solid #d6d4e0; color: #1b1b2f; background: #ffffff; }
.primary { border: 0; color: #ffffff; background: #6236f5; }
.actions button:focus-visible { outline: 2px solid #6236f5; outline-offset: 2px; }
`;

export interface CartoonizeUi {
  destroy(): void;
  /** For tests and the popup later: undo every swapped image. */
  restoreAll(): void;
}

export function createCartoonizeUi(doc: Document, deps: CartoonizeDeps): CartoonizeUi {
  const host = doc.createElement(UI_HOST_TAG);
  // Closed: page scripts can't reach in (e.g. to click the chip). Tests
  // need to look inside, so the e2e build uses an open root.
  const root = host.attachShadow({ mode: import.meta.env.MODE === 'e2e' ? 'open' : 'closed' });
  const style = doc.createElement('style');
  style.textContent = CSS;
  const chip = doc.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  const live = doc.createElement('span');
  live.setAttribute('role', 'status');
  live.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
  const dialog = doc.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'tw-consent-title');
  // Built with DOM APIs only (no HTML strings); static text only.
  dialog.append(
    Object.assign(doc.createElement('h2'), {
      id: 'tw-consent-title',
      textContent: 'Cartoonize with AI?',
    }),
    Object.assign(doc.createElement('p'), {
      textContent:
        'To redraw a picture, Toonify sends that image’s web address to Toonify’s server, which downloads it and asks Google Gemini to redraw it in your style.',
    }),
  );
  const list = doc.createElement('ul');
  for (const line of [
    'Only images you click are sent. Never the page, your text or your browsing.',
    'Images are not stored by Toonify.',
    'AI images carry Google’s invisible SynthID watermark.',
  ]) {
    list.append(Object.assign(doc.createElement('li'), { textContent: line }));
  }
  const actions = doc.createElement('div');
  actions.className = 'actions';
  const cancel = Object.assign(doc.createElement('button'), {
    type: 'button',
    className: 'secondary',
    textContent: 'Not now',
  });
  const allow = Object.assign(doc.createElement('button'), {
    type: 'button',
    className: 'primary',
    textContent: 'Allow and cartoonize',
  });
  actions.append(cancel, allow);
  dialog.append(list, actions);
  // Handoff hint: what to do in the AI app, plus a way to copy the instruction again.
  const hint = doc.createElement('div');
  hint.className = 'hint';
  hint.setAttribute('role', 'dialog');
  hint.setAttribute('aria-label', 'Next step');
  const hintTitle = doc.createElement('strong');
  const hintBody = doc.createElement('p');
  const hintRow = doc.createElement('div');
  hintRow.className = 'row';
  const copyAgain = Object.assign(doc.createElement('button'), {
    type: 'button',
    className: 'secondary',
    textContent: 'Copy instruction',
  });
  const hintDone = Object.assign(doc.createElement('button'), {
    type: 'button',
    className: 'primary',
    textContent: 'Done',
  });
  hintRow.append(copyAgain, hintDone);
  hint.append(hintTitle, hintBody, hintRow);
  root.append(style, chip, live, dialog, hint);
  doc.documentElement.append(host);

  const swaps = new Map<HTMLImageElement, Swap>();
  const busy = new Set<HTMLImageElement>();
  let target: HTMLImageElement | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let errorText = '';

  const announce = (text: string) => {
    live.textContent = text;
  };

  const stateOf = (image: HTMLImageElement): ChipState =>
    busy.has(image)
      ? 'busy'
      : swaps.has(image)
        ? 'done'
        : errorText && image === target
          ? 'error'
          : 'idle';

  const render = () => {
    if (target === null || !target.isConnected) {
      chip.dataset.visible = 'false';
      return;
    }
    const state = stateOf(target);
    chip.dataset.state = state;
    chip.dataset.visible = 'true';
    chip.removeAttribute('aria-busy');
    if (state === 'busy') {
      chip.setAttribute('aria-busy', 'true');
      chip.replaceChildren(
        Object.assign(doc.createElement('span'), { className: 'spinner' }),
        doc.createTextNode('Cartoonizing…'),
      );
    } else if (state === 'done') {
      chip.replaceChildren(icon(doc, ICONS.undo), doc.createTextNode('Show original'));
    } else if (state === 'error') {
      chip.textContent = errorText;
    } else {
      const tool = deps.currentTool();
      const label = tool.kind === 'account' ? `Cartoonize in ${tool.name}` : 'Cartoonize';
      chip.replaceChildren(icon(doc, ICONS.sparkles), doc.createTextNode(label));
    }
    const rect = target.getBoundingClientRect();
    const width = chip.offsetWidth || 120;
    chip.style.top = `${Math.max(8, rect.top + 8)}px`;
    chip.style.left = `${Math.max(8, Math.min(rect.right - width - 8, doc.documentElement.clientWidth - width - 8))}px`;
  };

  const show = (image: HTMLImageElement) => {
    if (hideTimer !== null) clearTimeout(hideTimer);
    hideTimer = null;
    if (target !== image) errorText = '';
    target = image;
    render();
  };

  const scheduleHide = () => {
    if (hideTimer !== null || dialog.open) return;
    hideTimer = setTimeout(() => {
      hideTimer = null;
      target = null;
      errorText = '';
      render();
    }, 300);
  };

  /** Finds a styled photo under the pointer, even below transparent overlays. */
  const mediaAt = (x: number, y: number): HTMLImageElement | null => {
    for (const element of doc.elementsFromPoint(x, y)) {
      if (element === host) return null; // pointer is on our chip
      if (element instanceof HTMLImageElement && element.getAttribute(MARK) === 'media')
        return element;
    }
    return null;
  };

  let frame: number | null = null;
  let lastPoint: { x: number; y: number } | null = null;
  const onPointerMove = (event: PointerEvent) => {
    lastPoint = { x: event.clientX, y: event.clientY };
    frame ??= requestAnimationFrame(() => {
      frame = null;
      if (lastPoint === null) return;
      const path = doc.elementsFromPoint(lastPoint.x, lastPoint.y);
      if (path[0] === host) {
        if (hideTimer !== null) clearTimeout(hideTimer);
        hideTimer = null;
        return;
      }
      const image = mediaAt(lastPoint.x, lastPoint.y);
      if (image) show(image);
      else scheduleHide();
    });
  };
  const onViewportChange = () => {
    if (target !== null) render();
  };

  const swapIn = (image: HTMLImageElement, result: Extract<CartoonizeResult, { ok: true }>) => {
    const bytes = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
    swaps.set(image, {
      src: image.getAttribute('src'),
      srcset: image.getAttribute('srcset'),
      sizes: image.getAttribute('sizes'),
      blobUrl,
    });
    // srcset would win over src, so it is removed while the cartoon shows.
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.src = blobUrl;
    image.setAttribute(CARTOON_ATTRIBUTE, '');
  };

  const restore = (image: HTMLImageElement) => {
    const swap = swaps.get(image);
    if (!swap) return;
    swaps.delete(image);
    const put = (name: string, value: string | null) =>
      value === null ? image.removeAttribute(name) : image.setAttribute(name, value);
    put('sizes', swap.sizes);
    put('srcset', swap.srcset);
    put('src', swap.src);
    image.removeAttribute(CARTOON_ATTRIBUTE);
    URL.revokeObjectURL(swap.blobUrl);
  };

  const askConsent = () =>
    new Promise<boolean>((resolve) => {
      const finish = (answer: boolean) => {
        cancel.onclick = null;
        allow.onclick = null;
        dialog.onclose = null;
        if (dialog.open) dialog.close();
        resolve(answer);
      };
      cancel.onclick = () => finish(false);
      allow.onclick = () => finish(true);
      dialog.onclose = () => finish(false); // Esc
      dialog.showModal();
      cancel.focus(); // safe default: nothing is sent unless the user chooses to
    });

  const cartoonize = async (image: HTMLImageElement) => {
    const imageUrl = image.currentSrc || image.src;
    if (!/^https?:\/\//.test(imageUrl)) {
      errorText = 'This image can’t be cartoonized.';
      render();
      return;
    }
    if (!(await deps.hasConsent())) {
      const agreed = await askConsent();
      chip.focus({ preventScroll: true });
      if (!agreed) return;
      await deps.giveConsent();
    }
    busy.add(image);
    errorText = '';
    render();
    announce('Cartoonizing image');
    const result = await deps
      .requestCartoon({ imageUrl, width: image.naturalWidth, height: image.naturalHeight })
      .catch((): CartoonizeResult => ({
        ok: false,
        code: 'extension',
        message: 'Something went wrong. Please try again.',
      }));
    busy.delete(image);
    if (!image.isConnected) return;
    if (result.ok) {
      swapIn(image, result);
      announce('Image cartoonized');
    } else {
      errorText = result.message;
      if (target !== image) target = image;
      announce(result.message);
    }
    render();
  };

  const showHint = (tool: AiTool, copiedImage: boolean, opened: boolean) => {
    hintTitle.textContent = opened
      ? `${tool.name} opened in a new tab`
      : `Open ${tool.name} to continue`;
    hintBody.textContent = copiedImage
      ? `The picture and the style instruction are copied. In ${tool.name}, paste with Ctrl+V (Cmd+V on Mac) and send. If only the picture appears, come back here and copy the instruction.`
      : `This site doesn’t let Toonify copy the picture. Right-click it, choose “Copy image” and paste it in ${tool.name}, then copy the instruction here and paste it too.`;
    const rect = chip.getBoundingClientRect();
    hint.style.top = `${Math.max(8, Math.min(rect.bottom + 8, doc.documentElement.clientHeight - 200))}px`;
    hint.style.left = `${Math.max(8, Math.min(rect.right - 300, doc.documentElement.clientWidth - 308))}px`;
    hint.dataset.visible = 'true';
    announce(hintTitle.textContent);
  };
  copyAgain.addEventListener('click', () => {
    void navigator.clipboard.writeText(deps.stylePrompt()).then(
      () => {
        copyAgain.textContent = 'Copied';
        setTimeout(() => (copyAgain.textContent = 'Copy instruction'), 2000);
      },
      () => announce('Couldn’t copy. Please try again.'),
    );
  });
  hintDone.addEventListener('click', () => {
    hint.dataset.visible = 'false';
  });

  /**
   * Account handoff (Gemini / ChatGPT app). The clipboard write starts
   * synchronously inside the click, as browsers require; the PNG is filled
   * in as a promise. Then the AI app opens in a new tab.
   */
  const handoff = (image: HTMLImageElement, tool: AiTool) => {
    const prompt = deps.stylePrompt();
    const text = new Blob([prompt], { type: 'text/plain' });
    const write = navigator.clipboard
      .write([new ClipboardItem({ 'image/png': imageToPng(image, deps), 'text/plain': text })])
      .then(
        () => true,
        async () => {
          await navigator.clipboard.writeText(prompt).catch(() => undefined);
          return false;
        },
      );
    void write.then(async (copiedImage) => {
      const opened = await deps.openAiApp(tool.id).catch(() => false);
      showHint(tool, copiedImage, opened);
    });
  };

  chip.addEventListener('click', (event) => {
    if (!event.isTrusted) return; // only a real user click can send an image
    const image = target;
    if (image === null || busy.has(image)) return;
    if (swaps.has(image)) {
      restore(image);
      announce('Original image restored');
      render();
      return;
    }
    if (errorText) {
      errorText = '';
      render();
      return;
    }
    const tool = deps.currentTool();
    if (tool.kind === 'account') {
      handoff(image, tool);
      return;
    }
    void cartoonize(image);
  });
  chip.addEventListener('pointerleave', scheduleHide);

  doc.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  doc.defaultView?.addEventListener('scroll', onViewportChange, { passive: true, capture: true });
  doc.defaultView?.addEventListener('resize', onViewportChange, { passive: true });

  const restoreAll = () => {
    for (const image of [...swaps.keys()]) restore(image);
  };

  return {
    restoreAll,
    destroy() {
      doc.removeEventListener('pointermove', onPointerMove, { capture: true });
      doc.defaultView?.removeEventListener('scroll', onViewportChange, { capture: true });
      doc.defaultView?.removeEventListener('resize', onViewportChange);
      if (frame !== null) cancelAnimationFrame(frame);
      if (hideTimer !== null) clearTimeout(hideTimer);
      if (dialog.open) dialog.close();
      restoreAll();
      host.remove();
    },
  };
}
