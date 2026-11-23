/** One thing a form checks: a field's key (its `data-field`), its name in the bar, and what is wrong with it now. */
export interface IFormRule {
  key: string;
  label: string;
  isMissing?: boolean;
  /** What is wrong, in words; null when nothing is. */
  error?: string | null;
  /** Something was typed or chosen, so a right value may show its tick. */
  isFilled?: boolean;
}

export interface IFormProblem {
  key: string;
  label: string;
  isMissing: boolean;
  message: string;
}
