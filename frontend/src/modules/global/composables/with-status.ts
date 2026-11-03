import { useToastStore } from 'global/stores/toast';

type FlagOf<S> = { [K in keyof S]: S[K] extends boolean ? K : never }[keyof S];

export interface IStatusOptions<S> {
  errorFlag?: FlagOf<S>;
  errorMessage?: string;
}

/** Logs in development only: production errors surface through the toast or the error flag. */
export const logDevError = (error: unknown): void => {
  if (import.meta.env.DEV) console.error(error);
};

const setFlag = <S extends object>(store: S, flag: FlagOf<S>, value: boolean): void => {
  Object.assign(store, { [flag]: value });
};

/** Runs a store task: raises `flag` meanwhile, and on failure returns null, sets `errorFlag` and toasts `errorMessage`. */
export const withStatus = async <S extends object, T>(store: S, flag: FlagOf<S>, task: () => Promise<T>, options: IStatusOptions<S> = {}): Promise<T | null> => {
  setFlag(store, flag, true);
  if (options.errorFlag) setFlag(store, options.errorFlag, false);
  try {
    return await task();
  } catch (error) {
    logDevError(error);
    if (options.errorFlag) setFlag(store, options.errorFlag, true);
    if (options.errorMessage) useToastStore().push(options.errorMessage, 'danger');
    return null;
  } finally {
    setFlag(store, flag, false);
  }
};
