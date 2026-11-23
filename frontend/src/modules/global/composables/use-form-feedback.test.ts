import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useFormFeedback } from 'global/composables/use-form-feedback';
import { normalizePhone } from 'global/composables/phone';

const buildForm = () => {
  const name = ref('');
  const phone = ref('');
  const feedback = useFormFeedback(() => [
    { key: 'name', label: 'Nom', isMissing: !name.value, isFilled: !!name.value },
    { key: 'phone', label: 'Téléphone', isMissing: !phone.value, error: phone.value && !normalizePhone(phone.value) ? 'Numéro incomplet' : null, isFilled: !!phone.value },
  ]);
  return { name, phone, ...feedback };
};

describe('useFormFeedback', () => {
  it('stays quiet on a field not left yet', () => {
    const form = buildForm();
    form.phone.value = '06';
    expect(form.errorOf('phone')).toBeNull();
  });

  it('speaks once the field is left, then follows what is typed', () => {
    const form = buildForm();
    form.phone.value = '06';
    form.touch('phone');
    expect(form.errorOf('phone')).toBe('Numéro incomplet');
    form.phone.value = '0661234518';
    expect([form.errorOf('phone'), form.isValid('phone')]).toEqual([null, true]);
  });

  it('never ticks an empty field', () => {
    const form = buildForm();
    form.touch('name');
    expect([form.errorOf('name'), form.isValid('name')]).toEqual(['Obligatoire', false]);
  });

  it('lists what is missing before anything is tapped, so the bar can show it', () => {
    const form = buildForm();
    form.name.value = 'Ali';
    expect(form.problemsComputed.value.map((problem) => [problem.label, problem.isMissing])).toEqual([['Téléphone', true]]);
  });

  it('shows every problem when Save is tapped too early, and saves nothing', () => {
    const form = buildForm();
    const save = vi.fn();
    form.attempt(save);
    expect([save.mock.calls.length, form.errorOf('name'), form.errorOf('phone')]).toEqual([0, 'Obligatoire', 'Obligatoire']);
  });

  it('saves once nothing is wrong', () => {
    const form = buildForm();
    const save = vi.fn();
    form.name.value = 'Ali';
    form.phone.value = '0661234518';
    form.attempt(save);
    expect(save).toHaveBeenCalledOnce();
  });

  it('forgets everything for the next entry', () => {
    const form = buildForm();
    form.attempt(() => undefined);
    form.reset();
    expect(form.errorOf('name')).toBeNull();
  });
});
