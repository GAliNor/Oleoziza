import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

/** One page of a list, with the page number kept inside the list when it shrinks. */
export const usePagedRows = <T>(
  rows: Ref<T[]>,
  pageSize: number,
): { page: Ref<number>; pageCount: ComputedRef<number>; pageRows: ComputedRef<T[]>; showRow: (index: number) => void } => {
  const page = ref(1);
  const pageCount = computed((): number => Math.max(1, Math.ceil(rows.value.length / pageSize)));
  const pageRows = computed((): T[] => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize));

  const showRow = (index: number): void => {
    if (index !== -1) page.value = Math.floor(index / pageSize) + 1;
  };

  watch(pageCount, (count) => {
    if (page.value > count) page.value = count;
  });

  return { page, pageCount, pageRows, showRow };
};
