import { describe, expect, it } from 'vitest';

import { clientAvatarVariant } from 'client/composables/avatar-variant';

describe('clientAvatarVariant', () => {
  it('draws Companies and Individuals differently', () => {
    expect([clientAvatarVariant('company'), clientAvatarVariant('individual')]).toEqual(['patchwork', 'notionists']);
  });
});
