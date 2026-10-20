import { defineStore } from 'pinia';

import type { IToastStore, ToastTone } from 'global/types/toast';

const TOAST_DURATION_MS = 6000;

let nextToastId = 1;

export const useToastStore = defineStore('toast', {
  state: (): IToastStore => ({
    toasts: [],
  }),
  actions: {
    push(message: string, tone: ToastTone = 'info'): void {
      const id = nextToastId++;
      this.toasts.push({ id, message, tone });
      setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
    },
    dismiss(id: number): void {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    },
  },
});
