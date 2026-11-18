# Chrome Web Store submission - Toonify Web 0.1.0

Everything to paste into the Chrome Web Store Developer Dashboard. Fields are listed in the order the dashboard shows them.

Upload: `.output/toonify-web-0.1.0-chrome.zip` (made with `npm run zip`).

---

## Store listing tab

**Title** (from the manifest): Toonify Web

**Summary** (from the manifest, max 132 characters):

> Make the web feel illustrated. A reversible, cartoon-inspired layer for websites.

**Description** (v2, after the "Yellow Argon" keyword-spam rejection on 19 Nov 2026: no third-party icon set names, no long list of style names):

```
Make any website feel illustrated, without breaking it.

Toonify Web adds a playful, cartoon-inspired layer to the websites you choose. Turn it on for a site, pick a look, and the page restyles instantly. Turn it off and everything is exactly as it was.

STYLES
Choose from 11 illustrated looks, from bold comic and pop art to soft watercolor and pencil sketch. Every site starts on its own original look until you pick one.

EFFECTS
Switch on extras for each site: hand-drawn lines, sticker-style photos, bouncy buttons, playful headings and a comic background.

ICONS
Redraw a site's icons with a matching icon set, or add another free open-source set in one click. Give icons a plain, cartoon, sketched or animated look.

SAFE TO USE
- Works only on sites you allow, one site at a time.
- Never changes a page's layout or what you can click.
- Keeps keyboard focus outlines and respects "reduce motion".
- One click to reset a site.

PRIVATE BY DESIGN
No accounts, no tracking, no ads. Your choices stay in your browser. Toonify only goes online when you add an icon set, to download it once.

This is an early version. Use "Feedback" in the popup to tell us what to improve.
```

**Category**: Lifestyle > Fun (alternative: Make Chrome Yours > Functionality & UI)

**Language**: English

**Graphic assets** (in `docs/store/images/`):

- Store icon: `public/icon/128.png` (128x128)
- Screenshots (1280x800): `screenshot-1-before-after.png`, `screenshot-2-styles.png`, `screenshot-3-effects.png`, `screenshot-4-icons.png`
- Small promo tile (440x280): `promo-small-440x280.png`
- Marquee promo tile (1400x560): optional, skipped for now

**Official URL**: none (optional; needs a verified website)

**Homepage URL**: https://github.com/ahmedjubair-shishir/toonify-web

**Support URL**: leave empty and turn on the built-in **Support hub** (Account > Item support > Visibility), so feedback arrives in the dashboard's User support tab.

**Mature content**: No

---

## Privacy practices tab

**Single purpose**:

> Toonify Web restyles the websites the user chooses with a reversible, cartoon-style visual layer (styles, optional effects and icon sets), only on sites the user allows.

**Permission justifications**:

- **storage**: Saves the user's settings in the browser: whether Toonify is on, which sites it is allowed on, and the style, effects and icon set chosen for each site. Nothing is sent anywhere.
- **activeTab**: When the user opens the popup, Toonify reads the current tab's address to show that site's settings and its on/off switch.
- **scripting**: Registers and injects Toonify's styling script only on sites the user has allowed, and into tabs of that site that are already open when the user allows it.
- **Host permission** (optional `*://*/*`): Requested at runtime for one site at a time, only when the user clicks "Allow" in the popup. Needed to apply the visual layer on that site. Nothing is granted at install, and "Reset site" removes it.

**Are you using remote code?** No. All code ships in the package. (Icon sets the user adds are SVG drawings saved as data and shown as images; they are cleaned of any scripts and never run.)

**Data usage** (what the extension collects):

- Tick **none** of the data types. Settings, including the names of sites the user allowed, are stored only on the user's device and never transmitted.

**Certifications** (tick all three):

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**: https://github.com/ahmedjubair-shishir/toonify-web/blob/main/PRIVACY.md

---

## Distribution tab

- **Payments**: Free
- **Visibility**: **Unlisted** for the first feedback round (only people with the link can install). Switch to Public later.
- **Regions**: All regions

---

## Feedback dashboard

- **Ratings tab**: star ratings and reviews over time.
- **User support tab** (after turning on the Support hub): questions, bug reports and suggestions, filterable by type; you can reply and set a status. Turn on email notifications in Account settings.
- The popup's **Feedback** link opens the store page when installed from the store (GitHub issues when installed unpacked).
