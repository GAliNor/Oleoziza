import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

import { usePagedRows } from 'global/composables/use-paged-rows';

const list = (length: number): number[] => Array.from({ length }, (_, index) => index);

describe('usePagedRows', () => {
  it('cuts the list into pages', () => {
    const { page, pageCount, pageRows } = usePagedRows(ref(list(25)), 10);
    expect([pageCount.value, pageRows.value[0], pageRows.value.length]).toEqual([3, 0, 10]);
    page.value = 3;
    expect([pageRows.value[0], pageRows.value.length]).toEqual([20, 5]);
  });

  it('counts one page for an empty list', () => {
    expect(usePagedRows(ref<number[]>([]), 10).pageCount.value).toBe(1);
  });

  it('pulls the page back when the list shrinks', async () => {
    const rows = ref(list(25));
    const { page } = usePagedRows(rows, 10);
    page.value = 3;
    rows.value = list(4);
    await nextTick();
    expect(page.value).toBe(1);
  });

  it('jumps to the page of a row, and ignores an unknown one', () => {
    const { page, showRow } = usePagedRows(ref(list(25)), 10);
    showRow(21);
    expect(page.value).toBe(3);
    showRow(-1);
    expect(page.value).toBe(3);
  });
});
