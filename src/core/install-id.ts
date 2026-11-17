import { storage } from '#imports';

/**
 * A random id created on this device, sent with AI requests so the server can
 * apply a fair per-user limit. It says nothing about the person: no account,
 * no browsing data. Removing the extension removes it.
 */
const installIdItem = storage.defineItem<string>('local:installId');

export async function getInstallId(): Promise<string> {
  const existing = await installIdItem.getValue();
  if (existing && /^[a-z0-9-]{8,64}$/i.test(existing)) return existing;
  const id = crypto.randomUUID();
  await installIdItem.setValue(id);
  return id;
}
