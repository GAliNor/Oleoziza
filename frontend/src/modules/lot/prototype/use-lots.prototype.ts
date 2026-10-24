// PROTOTYPE — in-memory Lots shared by the Opérations variants (ticket 0036): Management corrections (K2–K5) and the « à vérifier » queue (H4, K6).
import { computed, ref } from 'vue';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { LOT_STATUSES } from 'dashboard/prototype/mock-home.prototype';
import {
  FIELD_LABELS,
  buildSteps,
  createLotRecords,
  formatField,
  moneyOf,
  type CorrectableField,
  type ILotRecordPrototype,
} from 'lot/prototype/mock-lots.prototype';

const lots = ref<ILotRecordPrototype[]>(createLotRecords());

export const useLotsPrototype = () => {
  // stores
  const authStore = useAuthStore();
  const siteStore = useSiteStore();
  const toastStore = useToastStore();

  // computed
  const scoped = computed((): ILotRecordPrototype[] =>
    lots.value
      .filter((lot) => siteStore.isAllSites || lot.siteId === siteStore.currentSiteId)
      .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt)),
  );
  const toReview = computed((): ILotRecordPrototype[] => scoped.value.filter((lot) => lot.review));
  const isReadOnly = computed((): boolean => siteStore.isAllSites);
  const canCorrect = computed((): boolean => !isReadOnly.value && authStore.can('record.correct'));
  const canSeeAudit = computed((): boolean => authStore.can('audit_trail.view'));

  // methods
  const now = (): string => new Date().toISOString();

  const rebuild = (lot: ILotRecordPrototype): void => {
    const marks = new Map(lot.steps.map((step) => [step.key, { isCorrected: step.isCorrected, wasOffline: step.wasOffline, by: step.by }]));
    lot.steps = buildSteps(lot).map((step) => ({ ...step, ...marks.get(step.key) }));
  };

  const apply = (lot: ILotRecordPrototype, field: CorrectableField, value: string): void => {
    if (field === 'netKg' || field === 'oilKg') lot[field] = Number(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    else if (field === 'mode') lot.mode = value === 'purchase' ? 'purchase' : 'service';
    else lot[field] = value;
    if (field === 'oilKg' && lot.status === 'withdrawn') lot.withdrawnKg = lot.oilKg ?? 0;
  };

  const correct = (lot: ILotRecordPrototype, field: CorrectableField, value: string, reason: string): boolean => {
    if (!canCorrect.value || !reason.trim()) return false;
    const from = formatField(lot, field);
    const moneyBefore = moneyOf(lot).amount;
    apply(lot, field, value);
    const to = formatField(lot, field);
    if (from === to) return false;
    lot.corrections.unshift({ field, from, to, by: authStore.fullName, at: now(), reason: reason.trim() });
    rebuild(lot);
    const step = lot.steps.find((item) => item.field === field) ?? lot.steps[0];
    step.isCorrected = true;
    const moneyAfter = moneyOf(lot).amount;
    toastStore.push(
      moneyAfter !== moneyBefore
        ? `${FIELD_LABELS[field]} corrigé ; montant recalculé : ${Math.round(moneyAfter).toLocaleString('fr-FR')} DH`
        : `${FIELD_LABELS[field]} corrigé sur ${lot.code}`,
      'success',
    );
    return true;
  };

  const keepApplied = (lot: ILotRecordPrototype): void => {
    if (!canCorrect.value || lot.review?.kind !== 'conflict') return;
    lot.corrections.unshift({ field: lot.review.field, from: lot.review.other.value, to: lot.review.applied.value, by: authStore.fullName, at: now(), reason: 'Conflit hors ligne : valeur gardée' });
    lot.review = null;
    toastStore.push(`${lot.code} vérifié`, 'success');
  };

  const takeOther = (lot: ILotRecordPrototype): void => {
    if (!canCorrect.value || lot.review?.kind !== 'conflict') return;
    const { field, other } = lot.review;
    lot.review = null;
    correct(lot, field, other.value, `Conflit hors ligne : valeur de ${other.by} retenue`);
  };

  const acceptWrite = (lot: ILotRecordPrototype): void => {
    if (!canCorrect.value || lot.review?.kind !== 'permission') return;
    lot.corrections.unshift({ field: 'client', from: '—', to: '—', by: authStore.fullName, at: now(), reason: `Saisie de ${lot.review.by} acceptée malgré le droit retiré` });
    lot.review = null;
    toastStore.push(`${lot.code} vérifié ; la saisie est gardée`, 'success');
  };

  const undoWrite = (lot: ILotRecordPrototype): void => {
    if (!canCorrect.value || lot.review?.kind !== 'permission') return;
    const { stepKey, by } = lot.review;
    const index = LOT_STATUSES.indexOf(stepKey as never);
    if (index > 0) lot.status = LOT_STATUSES[index - 1];
    lot.review = null;
    lot.corrections.unshift({ field: 'client', from: '—', to: '—', by: authStore.fullName, at: now(), reason: `Saisie de ${by} annulée (droit retiré)` });
    rebuild(lot);
    toastStore.push(`${lot.code} revient « ${lot.status === 'waiting' ? 'En attente' : lot.status} »`, 'success');
  };

  const reprint = (lot: ILotRecordPrototype): void => {
    const last = lot.corrections[0];
    toastStore.push(last ? `Ticket ${lot.code} réimprimé : « Annule et remplace le ticket du ${new Date(lot.receivedAt).toLocaleDateString('fr-FR')} »` : `Ticket ${lot.code} réimprimé`, 'success');
  };

  const find = (id: string | null): ILotRecordPrototype | undefined => lots.value.find((lot) => lot.id === id);

  const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

  return { lots, scoped, toReview, isReadOnly, canCorrect, canSeeAudit, correct, keepApplied, takeOther, acceptWrite, undoWrite, reprint, find, siteName };
};
