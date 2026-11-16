import { i18n } from '~/plugins/i18n';
import { readApiErrorCode } from 'global/services/api-error';
import { useToastStore } from 'global/stores/toast';

type FlagOf<S> = { [K in keyof S]: S[K] extends boolean ? K : never }[keyof S];
type CodeOf<S> = { [K in keyof S]: S[K] extends string | null ? K : never }[keyof S];

export interface IStatusOptions<S> {
  errorFlag?: FlagOf<S>;
  /** State field that receives the refusal code (`code_taken`), so a form can say what went wrong; cleared before the task. */
  errorCode?: CodeOf<S>;
  errorMessage?: string;
}

/** Logs in development only: production errors surface through the toast or the error flag. */
export const logDevError = (error: unknown): void => {
  if (import.meta.env.DEV) console.error(error);
};

/** The translated refusal (`global.errors.<code>`) when the code has one, else the store's generic message. */
const buildErrorMessage = (error: unknown, fallback: string): string => {
  const code = readApiErrorCode(error);
  const key = `global.errors.${code}`;
  return code && i18n.global.te(key) ? i18n.global.t(key) : fallback;
};

const setFlag = <S extends object>(store: S, flag: FlagOf<S>, value: boolean): void => {
  Object.assign(store, { [flag]: value });
};

/** Runs a store task: raises `flag` meanwhile, and on failure returns null, sets `errorFlag` and toasts the refusal's message, or `errorMessage`. */
export const withStatus = async <S extends object, T>(store: S, flag: FlagOf<S>, task: () => Promise<T>, options: IStatusOptions<S> = {}): Promise<T | null> => {
  setFlag(store, flag, true);
  if (options.errorFlag) setFlag(store, options.errorFlag, false);
  if (options.errorCode) Object.assign(store, { [options.errorCode]: null });
  try {
    return await task();
  } catch (error) {
    logDevError(error);
    if (options.errorFlag) setFlag(store, options.errorFlag, true);
    if (options.errorCode) Object.assign(store, { [options.errorCode]: readApiErrorCode(error) });
    if (options.errorMessage) useToastStore().push(buildErrorMessage(error, options.errorMessage), 'danger');
    return null;
  } finally {
    setFlag(store, flag, false);
  }
};
