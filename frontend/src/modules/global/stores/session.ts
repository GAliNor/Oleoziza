import { defineStore } from 'pinia';

import type { ISession, ISessionStore } from 'global/types/session';

/** Who is signed in, read across modules; the auth module signs in, refreshes and signs out. */
export const useSessionStore = defineStore('session', {
  state: (): ISessionStore => ({
    session: null,
    isReady: false,
    hasExpired: false,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.session !== null,
    isStaff: (state): boolean => state.session !== null && state.session.role !== 'client',
    fullName: (state): string => (state.session ? `${state.session.firstName} ${state.session.lastName}` : ''),
    salutation(state): string {
      if (!state.session) return '';
      return state.session.title ? `${state.session.title} ${state.session.lastName}` : this.fullName;
    },
  },
  actions: {
    setSession(session: ISession | null): void {
      this.session = session;
      if (session) this.hasExpired = false;
    },
    /** Drops a session the server no longer refreshes, so the shell can send the user back to login. */
    expire(): void {
      this.session = null;
      this.hasExpired = true;
    },
    markReady(): void {
      this.isReady = true;
    },
  },
});
