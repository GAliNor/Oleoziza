import { defineStore } from 'pinia';

import UserService from 'user/services/user';
import { logDevError, withStatus } from 'global/composables/with-status';
import { cachedLoad, LOAD_TTL_MS } from 'global/composables/cached-load';
import type { LoginMethod } from 'auth/types/auth';
import type { Permission } from 'global/types/session';
import type { IContactCheck, IContactHolders, IStaffForm, IStaffProfile, IStaffSecret, IStaffUser, IUserStore, StaffRole, StaffStatus } from 'user/types/user';

const userService = new UserService();

export const useUserStore = defineStore('user', {
  state: (): IUserStore => ({
    users: [],
    isLoading: false,
    isSaving: false,
    hasError: false,
    saveErrorCode: null,
  }),
  getters: {
    findUser:
      (state) =>
      (id: string | null): IStaffUser | undefined =>
        state.users.find((user) => user.id === id),
  },
  actions: {
    async fetchUsers(isForced = false): Promise<void> {
      await withStatus(
        this,
        'isLoading',
        () =>
          cachedLoad(
            'users',
            LOAD_TTL_MS.records,
            async () => {
              this.users = await userService.getAll();
            },
            isForced,
          ),
        { errorFlag: 'hasError' },
      );
    },
    async create(form: IStaffForm): Promise<IStaffUser | null> {
      const user = await this.run(() => userService.create(form));
      if (user) this.users.push(user);
      return user;
    },
    async setSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<boolean> {
      return this.apply(() => userService.updateSitePermissions(id, siteId, permissions));
    },
    async setLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<boolean> {
      return this.apply(() => userService.updateLoginMethods(id, loginMethods));
    },
    async setStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<boolean> {
      return this.apply(() => userService.updateStatus(id, status));
    },
    async updateProfile(id: string, profile: IStaffProfile): Promise<boolean> {
      return this.apply(() => userService.updateProfile(id, profile));
    },
    async setRole(id: string, role: StaffRole): Promise<boolean> {
      return this.apply(() => userService.updateRole(id, role));
    },
    async setSecret(id: string, secret: IStaffSecret): Promise<boolean> {
      return this.apply(() => userService.updateSecret(id, secret));
    },
    async setOwnership(id: string, isOwner: boolean): Promise<boolean> {
      return this.apply(() => userService.updateOwnership(id, isOwner));
    },
    /** Asked while a contact is typed; a failure says nothing, the save still refuses it. */
    async checkContacts(contact: IContactCheck): Promise<IContactHolders> {
      try {
        return await userService.checkContacts(contact);
      } catch (error) {
        logDevError(error);
        return { phoneTakenBy: null, emailTakenBy: null };
      }
    },
    async sendInvitation(id: string): Promise<boolean> {
      return this.apply(() => userService.sendInvitation(id));
    },
    async resetCredential(id: string): Promise<boolean> {
      return (await this.run(async () => (await userService.resetCredential(id), true))) ?? false;
    },
    async apply(request: () => Promise<IStaffUser>): Promise<boolean> {
      const user = await this.run(request);
      if (!user) return false;
      const index = this.users.findIndex((candidate) => candidate.id === user.id);
      if (index !== -1) this.users.splice(index, 1, user);
      return true;
    },
    run<T>(request: () => Promise<T>): Promise<T | null> {
      return withStatus(this, 'isSaving', request, { errorCode: 'saveErrorCode' });
    },
  },
});
