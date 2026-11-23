<template>
  <div class="flex flex-col gap-2">
    <ui-combobox
      :id="id"
      :model-value="modelValue"
      :options="optionsComputed"
      :label="$t('expense.form.supplier')"
      :placeholder="$t('expense.form.supplierPlaceholder')"
      can-create
      @update:model-value="handlePick"
      @create="handleStartCreate"
    />
    <div v-if="!newSupplier" class="flex flex-wrap gap-1">
      <button type="button" class="btn-plain min-h-9 px-2" @click="handleStartCreate('')">
        <add-line-icon class="h-4 w-4" />
        {{ $t('expense.supplier.add') }}
      </button>
      <button v-if="modelValue" type="button" class="btn-plain min-h-9 px-2" @click="handleClear">{{ $t('expense.supplier.clear') }}</button>
    </div>

    <Transition name="menu-pop">
      <div v-if="newSupplier" class="flex flex-col gap-3 rounded-card border border-brand/40 bg-selected/20 p-4" role="group" @keydown.esc.stop="newSupplier = null" :aria-label="$t('expense.supplier.title')">
        <div class="flex items-center justify-between gap-3">
          <p class="label">{{ $t('expense.supplier.title') }}</p>
          <p class="body-three">{{ $t('expense.supplier.hint') }}</p>
        </div>
        <div class="grid gap-3 @2xl:grid-cols-3">
          <ui-field v-slot="{ id: nameId }" class="@2xl:col-span-3" :label="$t('expense.supplier.name')">
            <input :id="nameId" ref="nameInput" v-model="newSupplier.name" class="input" type="text" />
          </ui-field>
          <ui-field v-slot="{ id: iceId }" class="@2xl:col-span-2" :label="$t('expense.form.ice')" is-optional>
            <input :id="iceId" v-model="newSupplier.ice" class="input tabular-nums" type="text" inputmode="numeric" maxlength="15" :placeholder="$t('expense.form.iceHint')" />
          </ui-field>
          <ui-field v-slot="{ id: taxId }" :label="$t('expense.form.if')" is-optional>
            <input :id="taxId" v-model="newSupplier.taxId" class="input tabular-nums" type="text" inputmode="numeric" />
          </ui-field>
        </div>
        <p v-if="problem" class="form-error" role="alert">{{ $t(`expense.supplier.${problem}`) }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-plain" @click="newSupplier = null">{{ $t('expense.supplier.cancel') }}</button>
          <button type="button" class="btn-primary" :disabled="expenseStore.isSupplierSaving" @click="handleCreate">{{ $t('expense.supplier.create') }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onMounted, ref } from 'vue';

import { useExpenseStore } from 'expense/stores/expense';
import { ICE_PATTERN } from 'expense/composables/expense-draft';
import { createId } from 'global/composables/crypto';
import type { ISupplier } from 'expense/types/expense';
import type { ISelectOption } from 'global/types/select';

import UiCombobox from 'global/components/ui-combobox.vue';
import UiField from 'global/components/ui-field.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';

// props
defineProps<{ id?: string }>();

// emits
const modelValue = defineModel<string | null>({ required: true });
const emit = defineEmits<{ (event: 'select', supplier: ISupplier): void; (event: 'clear'): void }>();

// stores
const expenseStore = useExpenseStore();

// variables
const newSupplier = ref<ISupplier | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const problem = ref<'nameRequired' | 'iceInvalid' | 'error' | null>(null);

// computed
const optionsComputed = computed((): ISelectOption[] => expenseStore.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name, detail: supplier.ice ? `ICE ${supplier.ice}` : undefined })));

// event handlers
const handlePick = (id: string | null): void => {
  const supplier = expenseStore.suppliers.find((item) => item.id === id);
  if (!supplier) return;
  modelValue.value = supplier.id;
  emit('select', supplier);
};

const handleClear = (): void => {
  modelValue.value = null;
  emit('clear');
};

const handleStartCreate = async (name: string): Promise<void> => {
  problem.value = null;
  newSupplier.value = { id: createId(), name, ice: '', taxId: '' };
  await nextTick();
  nameInput.value?.focus();
};

const handleCreate = async (): Promise<void> => {
  if (!newSupplier.value) return;
  const { name, ice } = newSupplier.value;
  problem.value = !name.trim() ? 'nameRequired' : ice && !ICE_PATTERN.test(ice) ? 'iceInvalid' : null;
  if (problem.value) return;
  const created = await expenseStore.createSupplier({ ...newSupplier.value, name: name.trim() });
  if (!created) {
    problem.value = 'error';
    return;
  }
  newSupplier.value = null;
  modelValue.value = created.id;
  emit('select', created);
};

// lifecycle
onMounted(() => {
  expenseStore.fetchSuppliers();
});
</script>
