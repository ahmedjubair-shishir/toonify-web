import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { fetchImage, openAiApp } from '@/background/handoff';
import type { Sender } from '@/core/messaging';
import { AI_TOOLS, STYLE_PROMPTS, availableAiTools, getAiTool, stylePrompt } from '@/core/ai-tools';
import { setAiTool, setSiteEnabled } from '@/core/settings';
import type { SiteKey } from '@/core/site';
import { THEMES } from '@/core/themes';
import { STYLE_PROMPTS as SERVER_PROMPTS } from '../../server/lib/styles';

const site = 'wikipedia.org' as SiteKey;
const sender = { tab: { id: 7, url: 'https://www.wikipedia.org/wiki/Cat' } };

beforeEach(() => fakeBrowser.reset());
afterEach(() => vi.unstubAllEnvs());

describe('AI tool catalogue', () => {
  it('has unique ids, a label and a “needs” line for each tool', () => {
    const ids = AI_TOOLS.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tool of AI_TOOLS) {
      expect(tool.label.length).toBeGreaterThan(0);
      expect(tool.needs.length).toBeGreaterThan(0);
      if (tool.kind === 'account') expect(tool.appUrl).toMatch(/^https:\/\//);
    }
  });

  it('is hidden outside test builds: every saved tool reads as Off', () => {
    expect(getAiTool('gemini-account').id).toBe('off');
    expect(availableAiTools().map((tool) => tool.id)).toEqual(['off']);
  });

  it('falls back to Off for unknown, not-ready or unavailable tools (feature on)', () => {
    vi.stubEnv('MODE', 'e2e');
    expect(getAiTool('gemini-account').id).toBe('gemini-account');
    expect(getAiTool('nope').id).toBe('off');
    expect(getAiTool('gemini-key').id).toBe('off'); // coming soon
    expect(getAiTool('toonify').id).toBe('off'); // no server in this build
    expect(availableAiTools().some((tool) => tool.id === 'toonify')).toBe(false);
  });

  it('has a style instruction for every style, identical to the server copy', () => {
    for (const theme of THEMES) expect(stylePrompt(theme.id)).toBe(STYLE_PROMPTS[theme.id]);
    expect(STYLE_PROMPTS).toEqual(SERVER_PROMPTS);
    expect(stylePrompt('unknown')).toBe(STYLE_PROMPTS['classic-cartoon']);
  });
});

describe('openAiApp (account handoff, feature on)', () => {
  beforeEach(() => vi.stubEnv('MODE', 'e2e'));
  it('opens only the selected app, only from a site where Toonify is on', async () => {
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    const open = (tool: string, from: Sender = sender) =>
      openAiApp({ type: 'toonify/open-ai-app', tool }, from);

    expect(await open('gemini-account')).toEqual({ ok: false }); // site off
    await setSiteEnabled(site, true);
    expect(await open('gemini-account')).toEqual({ ok: false }); // tool not selected
    await setAiTool('gemini-account');
    expect(await open('chatgpt-account')).toEqual({ ok: false }); // not the selected one
    expect(await open('gemini-account', {})).toEqual({ ok: false }); // not from a tab
    expect(create).not.toHaveBeenCalled();

    expect(await open('gemini-account')).toEqual({ ok: true });
    expect(create).toHaveBeenCalledWith({
      url: 'https://gemini.google.com/app',
      active: true,
      openerTabId: 7,
    });
  });
});

describe('fetchImage (account handoff)', () => {
  const ask = (url: string, fetchImpl: typeof fetch) =>
    fetchImage({ type: 'toonify/fetch-image', url }, sender, fetchImpl);
  const image = (type: string, size = 3) =>
    (async () =>
      new Response(new Uint8Array(size), { headers: { 'content-type': type } })) as typeof fetch;

  it('returns real images only, from active sites only', async () => {
    expect(await ask('https://cdn.example/a.png', image('image/png'))).toEqual({ ok: false });
    await setSiteEnabled(site, true);
    expect(await ask('https://cdn.example/a.png', image('image/png'))).toEqual({
      ok: true,
      mimeType: 'image/png',
      base64: 'AAAA',
    });
    expect(await ask('https://cdn.example/a', image('text/html'))).toEqual({ ok: false });
    expect(await ask('file:///etc/passwd', image('image/png'))).toEqual({ ok: false });
    expect(await ask('https://cdn.example/big.png', image('image/png', 9 * 1024 * 1024))).toEqual({
      ok: false,
    });
  });
});
