import { describe, expect, it } from 'vitest';
import { isMessage } from '@/core/messaging';

describe('isMessage', () => {
  it('accepts known message types', () => {
    expect(isMessage({ type: 'toonify/get-status' })).toBe(true);
    expect(isMessage({ type: 'toonify/site-allowed', site: 'example.com' })).toBe(true);
  });

  it.each([null, undefined, 'toonify/get-status', {}, { type: 42 }, { type: 'other/message' }])(
    'rejects %j',
    (value) => {
      expect(isMessage(value)).toBe(false);
    },
  );
});
