import { defineStore } from 'pinia';

import { restoreUserLanguage } from 'global/composables/language';
import type { ISession, ISessionStore } from 'global/types/session';

/** Who is signed in, read across modules; the auth module signs in, refreshes and signs out. */
export const useSessionStore = defineStore('session', {
  state: (): ISessionStore => ({
    session: null,
    isReady: false,
    hasExpired: false,
    isBackofficeMode: false,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.session !== null,
    isStaff: (state): boolean => state.session !== null && state.session.role !== 'client',
    /** Whether the screens are the Backoffice's: for Management and the Accountant always, for an Operator once they jump there. */
    isBackofficeView: (state): boolean => state.session?.role === 'management' || state.session?.role === 'accountant' || (state.session?.role === 'operator' && state.isBackofficeMode),
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
      if (session?.userId !== this.session?.userId) this.isBackofficeMode = false;
      this.session = session;
      if (session) {
        this.hasExpired = false;
        restoreUserLanguage(session.userId);
      }
    },
    /** Drops a session the server no longer refreshes, so the shell can send the user back to login. */
    expire(): void {
      this.session = null;
      this.isBackofficeMode = false;
      this.hasExpired = true;
    },
    /** A display state, not a change of Role: the Permissions decide what opens either way. */
    setBackofficeMode(isOn: boolean): void {
      this.isBackofficeMode = isOn;
    },
    markReady(): void {
      this.isReady = true;
    },
  },
});
