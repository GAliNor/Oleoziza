<template>
  <section class="flex flex-col gap-4">
    <template v-if="!created">
      <header class="flex items-center justify-between">
        <h2 class="heading-three">Nouveau client</h2>
        <button type="button" class="link" @click="handleClose">{{ closeLabel }}</button>
      </header>
      <div class="flex items-center gap-3">
        <avatar-tag class="h-16 w-16" :name="name.trim() || 'Nouveau client'" :kind="kind === 'company' ? 'company' : 'client'" />
        <div class="grid flex-1 grid-cols-2 gap-2">
          <button type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === 'individual' }" @click="kind = 'individual'">Personne</button>
          <button type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === 'company' }" @click="kind = 'company'">Société</button>
        </div>
      </div>
      <input v-model="name" class="input" :placeholder="kind === 'company' ? 'Nom de la société' : 'Prénom et nom'" />
      <input v-model="phone" class="input" type="tel" inputmode="tel" placeholder="Téléphone (06…)" />
      <button type="button" class="btn-primary min-h-14 text-md" :disabled="!canSave" @click="handleSave">Créer le client</button>
    </template>

    <template v-else>
      <div class="flex flex-col items-center gap-2 py-2 text-center">
        <avatar-tag class="h-20 w-20" :name="created.name" :kind="created.kind === 'company' ? 'company' : 'client'" />
        <p class="heading-three">{{ created.name }}</p>
        <p class="body-two">Client créé · sera synchronisé</p>
      </div>
      <button type="button" class="btn-primary min-h-14 text-md" @click="handleReceive">Réceptionner maintenant</button>
      <button type="button" class="btn-secondary min-h-12" @click="handleClose">Plus tard</button>
    </template>
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — quick Client creation, slid in in place of the Operator Home list (ticket 0037).
// imports
import { computed, ref } from 'vue';

import { useClientStore } from 'client/stores/client';
import { useSiteStore } from 'site/stores/site';
import { createId } from 'global/composables/crypto';
import type { ClientKind, IClient } from 'client/types/client';

import AvatarTag from 'global/components/avatar-tag.vue';

// props
withDefaults(defineProps<{ closeLabel?: string }>(), { closeLabel: 'Fermer' });
const emit = defineEmits<{ close: []; receive: [clientId: string] }>();

// stores
const clientStore = useClientStore();
const siteStore = useSiteStore();

// variables
const kind = ref<ClientKind>('individual');
const name = ref('');
const phone = ref('');
const created = ref<IClient | null>(null);
const clientId = ref(createId());

// computed
const canSave = computed((): boolean => name.value.trim().length > 2 && phone.value.replace(/\D/g, '').length >= 9 && !clientStore.isSaving);

// event handlers
const handleSave = async (): Promise<void> => {
  const digits = phone.value.replace(/\D/g, '').replace(/^0/, '');
  created.value = await clientStore.createClient({ id: clientId.value, kind: kind.value, name: name.value.trim(), phone: digits, siteId: siteStore.currentSite?.id ?? '' });
};

const handleReceive = (): void => {
  if (created.value) emit('receive', created.value.id);
  handleClose();
};

const handleClose = (): void => {
  name.value = '';
  phone.value = '';
  created.value = null;
  clientId.value = createId();
  emit('close');
};
</script>
