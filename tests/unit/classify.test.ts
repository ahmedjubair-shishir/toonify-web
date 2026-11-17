import { afterEach, describe, expect, it } from 'vitest';
import { MARK, classify, clearMarks, markTree, type Measure } from '@/content/classify';

// happy-dom has no layout engine, so sizes come from a data attribute.
const measure: Measure = (element) => {
  const [width = 0, height = 0] = (element.getAttribute('data-size') ?? '0x0')
    .split('x')
    .map(Number);
  return { width, height };
};

/** querySelector that fails the test loudly instead of returning null. */
const pick = (root: ParentNode, selector: string): Element => {
  const element = root.querySelector(selector);
  if (element === null) throw new Error(`missing ${selector}`);
  return element;
};

const html = (markup: string) => {
  document.body.innerHTML = markup;
  return document.body.firstElementChild as Element;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('classify', () => {
  it('treats large images as media and small ones as icons', () => {
    expect(classify(html('<img data-size="300x200">'), measure)).toBe('media');
    expect(classify(html('<img data-size="24x24">'), measure)).toBeNull();
    expect(classify(html('<img data-size="300x20">'), measure)).toBeNull();
  });

  it('skips decorative images', () => {
    expect(classify(html('<img role="presentation" data-size="300x200">'), measure)).toBeNull();
  });

  it('styles buttons with text, not icon-only buttons', () => {
    expect(classify(html('<button data-size="80x32">Save</button>'), measure)).toBe('button');
    expect(classify(html('<button data-size="32x32"><svg></svg></button>'), measure)).toBeNull();
    expect(classify(html('<input type="submit" value="Search" data-size="80x32">'), measure)).toBe(
      'button',
    );
    expect(classify(html('<div role="button" data-size="80x32">Open</div>'), measure)).toBe(
      'button',
    );
  });

  it('skips tiny buttons and nested buttons', () => {
    expect(classify(html('<button data-size="40x12">x</button>'), measure)).toBeNull();
    const outer = html(
      '<button data-size="80x32"><span role="button" data-size="60x24">Go</span></button>',
    );
    expect(classify(pick(outer, 'span'), measure)).toBeNull();
  });

  it('styles visible text fields only', () => {
    expect(classify(html('<input type="search" data-size="200x32">'), measure)).toBe('field');
    expect(classify(html('<textarea data-size="200x80"></textarea>'), measure)).toBe('field');
    expect(classify(html('<input type="search" data-size="0x0">'), measure)).toBeNull();
    expect(classify(html('<input type="checkbox" data-size="16x16">'), measure)).toBeNull();
  });

  it('never touches editors, app widgets, hidden areas or opted-out areas', () => {
    for (const zone of [
      '<div contenteditable="true">',
      '<div role="application">',
      '<div aria-hidden="true">',
      '<div data-toonify-skip>',
    ]) {
      const root = html(
        `${zone}<img data-size="300x200"><button data-size="80x32">Bold</button></div>`,
      );
      expect(classify(pick(root, 'img'), measure)).toBeNull();
      expect(classify(pick(root, 'button'), measure)).toBeNull();
    }
  });
});

describe('markTree / clearMarks', () => {
  it('marks a whole tree, updates marks, and clears them all', () => {
    html(`<main>
      <img id="photo" data-size="300x200"><img id="icon" data-size="16x16">
      <button id="save" data-size="80x32">Save</button><input id="q" type="text" data-size="200x32">
    </main>`);
    markTree(document, measure);
    const mark = (id: string) => pick(document, `#${id}`).getAttribute(MARK);
    expect([mark('photo'), mark('icon'), mark('save'), mark('q')]).toEqual([
      'media',
      null,
      'button',
      'field',
    ]);

    pick(document, '#photo').setAttribute('data-size', '20x20');
    markTree(document, measure);
    expect(mark('photo')).toBeNull();

    clearMarks(document);
    expect(document.querySelectorAll(`[${MARK}]`).length).toBe(0);
  });
});
