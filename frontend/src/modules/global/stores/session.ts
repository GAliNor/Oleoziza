import { defineStore } from 'pinia';

import { restoreUserLanguage } from 'global/composables/language';
import { readStorage, writeStorage } from 'global/composables/storage';
import { OPERATOR_MODE_STORAGE_KEY } from 'global/constants/navigation';
import type { ISession, ISessionStore } from 'global/types/session';

/** Who is signed in, read across modules; the auth module signs in, refreshes and signs out. */
export const useSessionStore = defineStore('session', {
  state: (): ISessionStore => ({
    session: null,
    isReady: false,
    hasExpired: false,
    isOperatorMode: false,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.session !== null,
    isStaff: (state): boolean => state.session !== null && state.session.role !== 'client',
    /** Whether the screens are the Backoffice's: for the Accountant always, for Management unless it works as an Operator. */
    isBackofficeView: (state): boolean => state.session?.role === 'accountant' || (state.session?.role === 'management' && !state.isOperatorMode),
    /** Whether the screens are the Operator's: for an Operator always, for Management while it works as an Operator. */
    isOperatorView: (state): boolean => state.session?.role === 'operator' || (state.session?.role === 'management' && state.isOperatorMode),
    /** Nobody but the Owner validates what they recorded themselves. */
    canValidate: (state) => (recordedBy: string): boolean => state.session?.isOwner === true || recordedBy !== `${state.session?.firstName} ${state.session?.lastName}`,
    fullName: (state): string => (state.session ? `${state.session.firstName} ${state.session.lastName}` : ''),
    salutation(state): string {
      if (!state.session) return '';
      return state.session.title ? `${state.session.title} ${state.session.lastName}` : this.fullName;
    },
  },
  actions: {
    setSession(session: ISession | null): void {
      if (session?.userId !== this.session?.userId) this.isOperatorMode = session?.role === 'management' && readStorage<string | null>(OPERATOR_MODE_STORAGE_KEY, null) === session.userId;
      this.session = session;
      if (!session) writeStorage(OPERATOR_MODE_STORAGE_KEY, null);
      if (session) {
        this.hasExpired = false;
        restoreUserLanguage(session.userId);
      }
    },
    /** Drops a session the server no longer refreshes, so the shell can send the user back to login. */
    expire(): void {
      this.session = null;
      this.isOperatorMode = false;
      this.hasExpired = true;
    },
    /** A display state, not a change of Role: Management keeps its Permissions. Kept across a reload, for the same User only. */
    setOperatorMode(isOn: boolean): void {
      const isAllowed = isOn && this.session?.role === 'management';
      this.isOperatorMode = isAllowed;
      writeStorage(OPERATOR_MODE_STORAGE_KEY, isAllowed ? this.session?.userId : null);
    },
    markReady(): void {
      this.isReady = true;
    },
  },
});
