# Toonify Web - Cartoonize server

A single endpoint, `POST /api/cartoonize`, that redraws one public image in a Toonify style with Google Gemini. It exists so the **Gemini API key never ships inside the extension** (spec: never expose private API keys).

## What it does

1. Accepts calls only from browser-extension origins (and, once set, only Toonify's extension id).
2. Checks an anonymous install id and rate limits: per user per hour, plus a global daily cap that protects your bill.
3. Downloads the image by URL, safely:
   - public addresses only, re-checked on every redirect
   - JPEG/PNG/WebP only
   - 8 MB cap, 10 s timeout
4. Sends it to Gemini (Interactions API) with the style instruction and returns the cartoon as JPEG.
5. Errors are short, user-safe messages. Google's error details are never passed on.

Nothing is stored on the server. Generated images include Google's invisible SynthID watermark.

## Setup (owner)

### 1. Gemini API key

1. Sign in to Google AI Studio with the account that will pay for usage.
2. Create an API key.
3. Image models may need billing enabled on that Google project; check AI Studio's pricing and limits page.
4. Keep the key private. It goes only into Vercel's environment variables (step 3), never into the extension, Git, or chat.

### 2. Vercel project

1. Push the repository to GitHub.
2. In Vercel, import the repository as a new project.
3. Set **Root Directory** to `server`. No build command is needed: Vercel runs `api/cartoonize.ts` as a function.

### 3. Environment variables (Vercel > Project > Settings > Environment Variables)

| Name                                                  | Required              | Value                                                                                                                                               |
| ----------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                      | yes                   | the key from step 1                                                                                                                                 |
| `GEMINI_IMAGE_MODEL`                                  | no                    | default `gemini-3.1-flash-lite-image` (cheapest); try `gemini-nano-banana-2.1` to compare quality                                                   |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | **yes in production** | from an Upstash Redis database (available in the Vercel Marketplace). Without them, production refuses requests, so there is no unlimited spending. |
| `LIMIT_PER_USER_PER_HOUR`                             | no                    | default 20                                                                                                                                          |
| `LIMIT_GLOBAL_PER_DAY`                                | no                    | default 500 (500 x the per-image price = worst-case daily cost)                                                                                     |
| `ALLOWED_EXTENSION_IDS`                               | before publishing     | your published extension id(s), comma separated; empty = any extension (development only)                                                           |

### 4. Tell the extension where the server is

The server URL is set at build time (next step of development).

## Tests

`npm run test` from the repository root runs `tests/server/*` with a stand-in for Gemini and the internet. A real Gemini call has **not** been tested yet: it needs the owner's key.
