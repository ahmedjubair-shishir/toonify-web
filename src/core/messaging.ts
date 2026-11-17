import { browser } from '#imports';
import type { SiteKey } from './site';

/**
 * Typed message contracts (spec 9.5). Every message has a `type`, and every
 * type has a known request and response shape. Incoming messages are treated
 * as untrusted and validated before use.
 */
export interface MessageMap extends HandoffMessages {
  /** Popup -> content script: is the layer actually on this page? */
  'toonify/get-status': {
    request: Record<never, never>;
    response: { site: string | null; applied: boolean };
  };
  /** Popup -> background: the user just allowed this site. */
  'toonify/site-allowed': {
    request: { site: SiteKey };
    response: { injectedTabs: number };
  };
  /**
   * Content script -> background: redraw one image the user clicked.
   * The background calls the owner's server (only after AI consent).
   */
  'toonify/cartoonize': {
    request: { imageUrl: string; width: number; height: number };
    response: CartoonizeResult;
  };
}

/** Content script -> background helpers for the account handoff. */
export interface HandoffMessages {
  /** Open the chosen AI app in a new tab (only known apps, never a page-given URL). */
  'toonify/open-ai-app': {
    request: { tool: string };
    response: { ok: boolean };
  };
  /** Download one image the page can't share directly (no CORS). */
  'toonify/fetch-image': {
    request: { url: string };
    response: { ok: true; mimeType: string; base64: string } | { ok: false };
  };
}

export type CartoonizeResult =
  { ok: true; mimeType: string; base64: string } | { ok: false; code: string; message: string };

export type MessageType = keyof MessageMap;
export type Message<T extends MessageType = MessageType> = { type: T } & MessageMap[T]['request'];
export type Response<T extends MessageType> = MessageMap[T]['response'];

const MESSAGE_TYPES: readonly MessageType[] = [
  'toonify/get-status',
  'toonify/site-allowed',
  'toonify/cartoonize',
  'toonify/open-ai-app',
  'toonify/fetch-image',
];

export function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false;
  const { type } = value as { type?: unknown };
  return typeof type === 'string' && (MESSAGE_TYPES as readonly string[]).includes(type);
}

export function sendToBackground<T extends MessageType>(message: Message<T>): Promise<Response<T>> {
  return browser.runtime.sendMessage(message) as Promise<Response<T>>;
}

export function sendToTab<T extends MessageType>(
  tabId: number,
  message: Message<T>,
): Promise<Response<T>> {
  return browser.tabs.sendMessage(tabId, message) as Promise<Response<T>>;
}

/** Who sent a message (tab and frame for content scripts). */
export interface Sender {
  tab?: { id?: number | undefined; url?: string | undefined } | undefined;
  url?: string | undefined;
}

type Handlers = {
  [T in MessageType]?: (message: Message<T>, sender: Sender) => Promise<Response<T>> | Response<T>;
};

/**
 * Registers one listener for the given handlers. Unknown or malformed
 * messages are ignored. Returns a function that removes the listener.
 */
export function onMessages(handlers: Handlers): () => void {
  const listener = (message: unknown, sender: Sender) => {
    if (!isMessage(message)) return undefined;
    const handler = handlers[message.type] as ((m: Message, s: Sender) => unknown) | undefined;
    if (!handler) return undefined;
    // Returning a promise tells the browser we will answer asynchronously.
    return Promise.resolve(handler(message, sender));
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
