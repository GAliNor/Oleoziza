import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useLotStore } from 'lot/stores/lot';
import { usePeriod, periodRange } from 'global/composables/use-period';
import { toIsoDate } from 'global/composables/date';
import type { ILot } from 'lot/types/lot';

/** The Lots of the current Site received in the selected period, newest first. */
export const useLotRegister = (): { scoped: ComputedRef<ILot[]> } => {
  const lotStore = useLotStore();
  const { period } = usePeriod();
  const scoped = computed((): ILot[] => {
    const { from, to } = periodRange(period.value.key);
    return lotStore.lots
      .filter((lot) => toIsoDate(lot.receivedAt) >= from && toIsoDate(lot.receivedAt) <= to)
      .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt));
  });
  return { scoped };
};

/** The Lot opened in the register, kept in the URL as ?lot=, and the last one so it can stay visible while sliding out. */
export const useOpenLot = (): {
  isOpen: ComputedRef<boolean>;
  active: ComputedRef<ILot | undefined>;
  lastId: Ref<string | null>;
  openLot: (id: string) => void;
  closeLot: () => void;
} => {
  const route = useRoute();
  const router = useRouter();
  const lotStore = useLotStore();
  const lastId = ref<string | null>(null);

  const find = (id: string | null): ILot | undefined => lotStore.lots.find((lot) => lot.id === id);
  const openId = computed((): string | null => (typeof route.query.lot === 'string' ? route.query.lot : null));
  const isOpen = computed((): boolean => find(openId.value) !== undefined);
  const active = computed((): ILot | undefined => find(openId.value ?? lastId.value));

  watch(
    openId,
    (id) => {
      if (id) lastId.value = id;
    },
    { immediate: true },
  );

  const openLot = (id: string): void => {
    router.replace({ query: { ...route.query, lot: id } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeLot = (): void => {
    router.replace({ query: { ...route.query, lot: undefined } });
  };

  return { isOpen, active, lastId, openLot, closeLot };
};
