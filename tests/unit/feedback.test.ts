import { describe, expect, it } from 'vitest';
import { GITHUB_ISSUES_URL, feedbackUrl } from '@/core/feedback';

const STORE_ID = 'abcdefghijklmnopabcdefghijklmnop';

describe('feedbackUrl', () => {
  it('store installs open the store page (ratings, reviews, support)', () => {
    expect(
      feedbackUrl({ update_url: 'https://clients2.google.com/service/update2/crx' }, STORE_ID),
    ).toBe(`https://chromewebstore.google.com/detail/${STORE_ID}`);
  });

  it('unpacked or other installs open GitHub issues', () => {
    expect(feedbackUrl({}, STORE_ID)).toBe(GITHUB_ISSUES_URL);
    expect(feedbackUrl({ update_url: 'https://example.com/updates.xml' }, STORE_ID)).toBe(
      GITHUB_ISSUES_URL,
    );
    expect(feedbackUrl({ update_url: 'https://clients2.google.com/x' }, 'not-an-id')).toBe(
      GITHUB_ISSUES_URL,
    );
  });
});
