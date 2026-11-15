import { ref, toRaw, watch, type Ref } from 'vue';

import { useSessionStore } from 'global/stores/session';
import { clearExpenseDraft, isWorthKeeping, saveExpenseDraft } from 'expense/composables/expense-draft-storage';
import type { ExpenseFormMode } from 'expense/composables/expense-draft';
import type { IExpensePayload } from 'expense/types/expense';

const SAVE_DELAY_MS = 500;

/** Keeps the form's draft on the device as it is typed, so a reload, a closed tab or a power cut doesn't lose it. */
export const useExpenseAutosave = (draft: IExpensePayload, mode: ExpenseFormMode, sourceId: string | null): { savedAt: Ref<string | null>; hasDroppedDocuments: Ref<boolean>; discard: () => void } => {
  const sessionStore = useSessionStore();
  const savedAt = ref<string | null>(null);
  const hasDroppedDocuments = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const save = (): void => {
    const userId = sessionStore.session?.userId;
    if (!userId || !isWorthKeeping(draft)) return;
    const stored = saveExpenseDraft(userId, draft.siteId, { mode, sourceId, payload: structuredClone(toRaw(draft)) });
    savedAt.value = stored?.savedAt ?? null;
    hasDroppedDocuments.value = stored?.hasDroppedDocuments ?? false;
  };

  watch(
    () => draft,
    () => {
      clearTimeout(timer);
      timer = setTimeout(save, SAVE_DELAY_MS);
    },
    { deep: true },
  );

  /** The Expense is saved: its draft goes. */
  const discard = (): void => {
    clearTimeout(timer);
    const userId = sessionStore.session?.userId;
    if (userId) clearExpenseDraft(userId, draft.siteId);
  };

  return { savedAt, hasDroppedDocuments, discard };
};
