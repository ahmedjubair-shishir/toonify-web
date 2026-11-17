/**
 * Build-time settings (not secrets: anyone can read an extension's code).
 * WXT_CARTOONIZE_URL is the owner's server endpoint, set in `.env.production`
 * (store build) or `.env.e2e` (tests). Empty = the AI feature is hidden.
 */
export const CARTOONIZE_URL: string = import.meta.env.WXT_CARTOONIZE_URL ?? '';

export const isCartoonizeAvailable = () => /^https?:\/\//.test(CARTOONIZE_URL);
