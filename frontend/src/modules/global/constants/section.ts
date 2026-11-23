import type { SectionTone } from 'global/types/section';

export const SECTION_TONES: Record<SectionTone, string> = {
  olive: 'bg-selected text-fg-brand',
  gold: 'bg-warning-subtle text-fg-warning',
  brown: 'bg-accent-subtle text-fg-accent',
  terracotta: 'bg-accent-rust/12 text-fg-place',
  blue: 'bg-info-subtle text-fg-info',
  neutral: 'bg-subtle text-fg-primary-paragraph',
};
