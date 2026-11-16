import { beforeEach } from 'vitest';

import { invalidateLoads } from 'global/composables/cached-load';

beforeEach(() => invalidateLoads());
