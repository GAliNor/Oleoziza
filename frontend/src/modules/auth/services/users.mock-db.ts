import { INVITATIONS_MOCK, USERS_MOCK } from 'auth/constants/mock-auth';
import type { IMockInvitation, IMockUser } from 'auth/types/mock-auth';

export const MOCK_USERS_DB: IMockUser[] = structuredClone(USERS_MOCK);

export const MOCK_INVITATIONS_DB: IMockInvitation[] = structuredClone(INVITATIONS_MOCK);
