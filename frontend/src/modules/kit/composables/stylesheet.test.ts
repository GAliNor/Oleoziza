import { describe, expect, it } from 'vitest';

import { readClasses, readTokens } from 'kit/composables/stylesheet';

const CSS = `
@theme static {
  --color-*: initial;
  --color-white: #fff;
  --color-ink-50: #f7f9fc;
  --shadow-raised: 0 2px 8px -2px rgb(13 24 36 / 0.18);
}

@layer components {
  .heading-one {
    @apply text-2xl;
  }

  .heading-one:hover,
  .body-two {
    @apply text-sm;
  }

  .tag-success::after {
    content: '';
  }
}
`;

describe('readTokens', () => {
  it('lists the tokens of one namespace in order, without wildcards', () => {
    expect(readTokens(CSS, 'color')).toEqual([
      { name: 'white', variable: '--color-white', value: '#fff' },
      { name: 'ink-50', variable: '--color-ink-50', value: '#f7f9fc' },
    ]);
  });

  it('keeps values that contain spaces and slashes', () => {
    expect(readTokens(CSS, 'shadow')).toEqual([{ name: 'raised', variable: '--shadow-raised', value: '0 2px 8px -2px rgb(13 24 36 / 0.18)' }]);
  });
});

describe('readClasses', () => {
  it('lists each class selector once, in order, without states or pseudo elements', () => {
    expect(readClasses(CSS)).toEqual(['heading-one', 'body-two', 'tag-success']);
  });
});
