export type ToastTone = 'info' | 'success' | 'danger' | 'dev';

export interface IToast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface IToastStore {
  toasts: IToast[];
}
