/**
 * Chrome Web Store images (not a test). Run only on purpose:
 *   npx wxt build --mode e2e
 *   STORE_SHOTS=1 npx playwright test store-shots
 * Writes docs/store/images/*.png (1280x800 screenshots, 440x280 promo tile).
 * The demo page (tests/fixtures/store/demo.html) is a made-up recipe site.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page, Worker } from '@playwright/test';
import { openPopup, openTab, test } from './fixtures';

const OUT = path.resolve('docs/store/images');
const DEMO_HOST = 'weekendkitchen.example';
const DEMO = 'http://localhost:4173/store/demo.html';

test.skip(!process.env.STORE_SHOTS, 'Store images are made on purpose: STORE_SHOTS=1');
test.describe.configure({ mode: 'serial' });

async function preset(worker: Worker, site: Record<string, unknown>) {
  await worker.evaluate(async (entry) => {
    await chrome.storage.local.set({
      settings: {
        globalEnabled: true,
        sites: { localhost: entry },
        aiConsent: false,
        aiTool: 'off',
      },
      customIconSets: [],
    });
  }, site);
}

const png = (buffer: Buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

async function pageShot(page: Page, width = 1000) {
  await page.setViewportSize({ width, height: 720 });
  await page.waitForTimeout(1200); // fonts, icons and effects settle
  return page.screenshot();
}

/** The popup as users see it, with the demo site's name (the test site is localhost). */
async function popupShot(
  context: BrowserContext,
  extensionId: string,
  tabId: number,
  tab?: RegExp,
) {
  const popup = await openPopup(context, extensionId, tabId);
  await popup.setViewportSize({ width: 360, height: 600 });
  // The AI section exists only in test builds.
  await popup.addStyleTag({ content: 'fieldset:has(#ai-picker-hint){display:none!important}' });
  if (tab) await popup.getByRole('tab', { name: tab }).click();
  await popup.evaluate((host) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      node.textContent = (node.textContent ?? '').replaceAll('localhost', host);
  }, DEMO_HOST);
  await popup.waitForTimeout(500);
  const shot = await popup.screenshot();
  await popup.close();
  return shot;
}

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; overflow: hidden; font-family: Inter, system-ui, sans-serif;
    background: radial-gradient(circle at 15% 0%, #ede7ff 0, #f7f5ff 40%, #ffffff 75%); color: #1b1530; }
  h1 { position: absolute; left: 56px; top: 44px; font-size: 40px; line-height: 1.1; letter-spacing: -0.02em; font-weight: 800; }
  h1 span { color: #6236f5; }
  p.sub { position: absolute; left: 56px; top: 100px; max-width: 790px; font-size: 19px; color: #514a66; }
  .browser { position: absolute; left: 56px; top: 156px; width: 800px; border-radius: 14px; overflow: hidden;
    background: #fff; box-shadow: 0 24px 60px rgba(40, 20, 90, 0.18), 0 0 0 1px rgba(40, 20, 90, 0.08); }
  .bar { height: 36px; display: flex; align-items: center; gap: 7px; padding: 0 14px; background: #f1eff6; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #d5d0e2; }
  .url { margin-left: 14px; flex: 1; height: 22px; border-radius: 11px; background: #fff; font-size: 12px; line-height: 22px; padding-left: 12px; color: #6b6480; }
  .browser img { display: block; width: 800px; }
  .popup { position: absolute; right: 56px; top: 120px; width: 340px; border-radius: 14px; overflow: hidden;
    box-shadow: 0 30px 70px rgba(40, 20, 90, 0.25), 0 0 0 1px rgba(40, 20, 90, 0.1); }
  .popup img { display: block; width: 340px; }
`;

const browserFrame = (img: string) => `
  <div class="browser"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
  <span class="url">${DEMO_HOST}/pancakes</span></div><img src="${img}"></div>`;

async function compose(context: BrowserContext, file: string, html: string) {
  const canvas = await context.newPage();
  await canvas.setViewportSize({ width: 1280, height: 800 });
  await canvas.setContent(
    `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>${html}</body></html>`,
  );
  await canvas.waitForTimeout(300);
  // JPEG-free, no transparency: the store wants 24-bit images.
  const shot = await canvas.screenshot({ omitBackground: false });
  writeFileSync(path.join(OUT, file), shot);
  await canvas.close();
}

test('store images', async ({ context, worker, extensionId }) => {
  test.setTimeout(120_000);
  mkdirSync(OUT, { recursive: true });

  // 1. Before / after
  await preset(worker, { enabled: false });
  const { page, tabId } = await openTab(context, worker, DEMO);
  const before = await pageShot(page, 700);
  await preset(worker, {
    enabled: true,
    theme: 'comic-book',
    effects: { sketch: true, sticker: true, headings: true, texture: true },
    iconSet: 'phosphor',
    iconLook: 'cartoon',
  });
  const after = await pageShot(page, 700);
  await compose(
    context,
    'screenshot-1-before-after.png',
    `<h1>Make any website feel <span>illustrated</span></h1>
     <p class="sub">The same page, before and after. Turn it off and everything is exactly as it was.</p>
     <div class="browser" style="width:1168px"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${DEMO_HOST}/pancakes</span></div>
       <div style="display:flex;position:relative">
         <img src="${png(before)}" style="width:584px;height:${Math.round((584 * 720) / 700)}px;object-fit:cover;object-position:left top">
         <img src="${png(after)}" style="width:584px;height:${Math.round((584 * 720) / 700)}px;object-fit:cover;object-position:left top">
         <span style="position:absolute;left:16px;bottom:16px;background:#1b1530;color:#fff;font:600 14px Inter,sans-serif;padding:6px 12px;border-radius:999px">Original</span>
         <span style="position:absolute;left:600px;bottom:16px;background:#6236f5;color:#fff;font:600 14px Inter,sans-serif;padding:6px 12px;border-radius:999px">With Toonify</span>
         <span style="position:absolute;left:583px;top:0;bottom:0;width:3px;background:#6236f5"></span>
       </div></div>`,
  );

  // 2. Styles
  await preset(worker, { enabled: true, theme: 'storybook' });
  const styles = await pageShot(page);
  const stylePopup = await popupShot(context, extensionId, tabId, /Style/);
  await compose(
    context,
    'screenshot-2-styles.png',
    `<h1>Pick a look: <span>11 styles</span></h1>
     <p class="sub">Comic Book, Storybook, Watercolor, Pop Art and more. Saved per site.</p>
     ${browserFrame(png(styles))}<div class="popup"><img src="${png(stylePopup)}"></div>`,
  );

  // 3. Effects
  await preset(worker, {
    enabled: true,
    theme: 'classic-cartoon',
    effects: { sketch: true, sticker: true, bouncy: true, headings: true, texture: true },
  });
  const effects = await pageShot(page);
  const effectsPopup = await popupShot(context, extensionId, tabId, /Effects/);
  await compose(
    context,
    'screenshot-3-effects.png',
    `<h1>Fun extras, <span>your choice</span></h1>
     <p class="sub">Hand-drawn lines, sticker photos, bouncy buttons, playful headings, comic backgrounds.</p>
     ${browserFrame(png(effects))}<div class="popup"><img src="${png(effectsPopup)}"></div>`,
  );

  // 4. Icons
  // The page's icons, captured one by one at 3x (crisp), before and after the swap.
  const ICONS = [
    'header .icon-btn:first-of-type svg',
    'header .icon-search',
    'header button[aria-label="Notifications"] svg',
    'header button[aria-label="Account"] svg',
    '.icon-heart',
    '.icon-share',
    '.icon-cart',
    '.icon-star',
  ];
  const cdp = await context.newCDPSession(page);
  const iconRow = async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1000,
      height: 720,
      deviceScaleFactor: 3,
      mobile: false,
    });
    await page.waitForTimeout(900);
    const shots: Buffer[] = [];
    for (const selector of ICONS) shots.push(await page.locator(selector).first().screenshot());
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    return shots;
  };
  await preset(worker, { enabled: true });
  await page.waitForTimeout(600);
  const plainIcons = await iconRow();
  await preset(worker, { enabled: true, iconSet: 'phosphor', iconLook: 'cartoon' });
  const icons = await pageShot(page);
  const swappedIcons = await iconRow();
  const strip = (imgs: Buffer[], label: string) => `
    <div style="display:flex;align-items:center;gap:14px">
      <span style="width:118px;font:600 14px Inter,sans-serif;color:#514a66">${label}</span>
      ${imgs
        .map(
          (
            img,
          ) => `<span style="display:grid;place-items:center;width:52px;height:52px;border-radius:10px;
            border:1px solid #e6e1f2;background:#fff"><img src="${png(img)}" style="width:28px;height:28px"></span>`,
        )
        .join('')}
    </div>`;
  const zoom = `<div style="position:absolute;left:96px;top:560px;padding:16px 18px;display:grid;gap:10px;border-radius:14px;
    background:#fff;box-shadow:0 18px 40px rgba(40,20,90,.2),0 0 0 1px rgba(40,20,90,.08)">
    ${strip(plainIcons, 'Site icons')}${strip(swappedIcons, 'Phosphor, Cartoon')}</div>`;
  const iconsPopup = await popupShot(context, extensionId, tabId, /Icons/);
  await compose(
    context,
    'screenshot-4-icons.png',
    `<h1>Fresh icons, <span>any look</span></h1>
     <p class="sub">Swap a site's icons for Lucide, Phosphor, Tabler or popular free sets.</p>
     ${browserFrame(png(icons))}<div class="popup"><img src="${png(iconsPopup)}"></div>${zoom}`,
  );

  // Small promo tile (440x280)
  const icon = png(readFileSync(path.resolve('public/icon/128.png')));
  const tile = await context.newPage();
  await tile.setViewportSize({ width: 440, height: 280 });
  await tile.setContent(`<!doctype html><html><body style="margin:0;width:440px;height:280px;overflow:hidden;
    font-family:Inter,system-ui,sans-serif;background:linear-gradient(135deg,#6236f5 0%,#8b5cf6 55%,#f59e0b 140%);color:#fff;
    display:flex;flex-direction:column;justify-content:center;padding:0 36px;box-sizing:border-box">
    <img src="${icon}" style="width:72px;height:72px;border-radius:18px;box-shadow:0 10px 24px rgba(0,0,0,.25)">
    <div style="font:800 38px/1.1 Inter,sans-serif;letter-spacing:-0.02em;margin-top:18px">Toonify Web</div>
    <div style="font:500 18px/1.35 Inter,sans-serif;opacity:.95;margin-top:6px">Make the web feel illustrated</div>
  </body></html>`);
  await tile.waitForTimeout(300);
  writeFileSync(path.join(OUT, 'promo-small-440x280.png'), await tile.screenshot());
  await tile.close();
});
