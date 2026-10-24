import { defineStore } from 'pinia';

import UserService from 'user/services/user';
import type { LoginMethod, Permission } from 'auth/types/auth';
import type { IStaffForm, IStaffUser, IUserStore, StaffStatus } from 'user/types/user';

const userService = new UserService();

export const useUserStore = defineStore('user', {
  state: (): IUserStore => ({
    users: [],
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    findUser:
      (state) =>
      (id: string | null): IStaffUser | undefined =>
        state.users.find((user) => user.id === id),
  },
  actions: {
    async fetchUsers(): Promise<void> {
      this.isLoading = true;
      this.hasError = false;
      try {
        this.users = await userService.getAll();
      } catch (error) {
        this.hasError = true;
        console.error(error);
      } finally {
        this.isLoading = false;
      }
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
    async run<T>(request: () => Promise<T>): Promise<T | null> {
      this.isSaving = true;
      this.hasError = false;
      try {
        return await request();
      } catch (error) {
        this.hasError = true;
        console.error(error);
        return null;
      } finally {
        this.isSaving = false;
      }
    },
  },
});
