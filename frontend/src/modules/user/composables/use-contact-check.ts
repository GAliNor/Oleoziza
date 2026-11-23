import { ref, type Ref } from 'vue';

import { useUserStore } from 'user/stores/user';
import { normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { normalizePhone } from 'global/composables/phone';
import { takenMessage } from 'user/composables/user-error';

/** Asks, once a phone or an email is left, who already logs in with it. The answer to an earlier value is dropped. */
export const useContactCheck = (exceptUserId?: string): { phoneTaken: Ref<string | null>; emailTaken: Ref<string | null>; checkPhone: (typed: string) => Promise<void>; checkEmail: (typed: string) => Promise<void> } => {
  // stores
  const userStore = useUserStore();

  // variables
  const phoneTaken = ref<string | null>(null);
  const emailTaken = ref<string | null>(null);
  let phoneAsked = '';
  let emailAsked = '';

  // methods
  const checkPhone = async (typed: string): Promise<void> => {
    const phone = normalizePhone(typed) ?? '';
    phoneAsked = phone;
    phoneTaken.value = null;
    if (!phone) return;
    const { phoneTakenBy } = await userStore.checkContacts({ phone, exceptUserId });
    if (phoneAsked === phone) phoneTaken.value = takenMessage(phoneTakenBy);
  };

  const checkEmail = async (typed: string): Promise<void> => {
    const email = normalizeIdentifier(typed) ?? '';
    emailAsked = email;
    emailTaken.value = null;
    if (!email) return;
    const { emailTakenBy } = await userStore.checkContacts({ email, exceptUserId });
    if (emailAsked === email) emailTaken.value = takenMessage(emailTakenBy);
  };

  return { phoneTaken, emailTaken, checkPhone, checkEmail };
};
