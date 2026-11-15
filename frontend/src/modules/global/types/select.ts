/** One choice of a dropdown; options sharing a `group` are listed under its heading, in the order given. */
export interface ISelectOption {
  value: string;
  label: string;
  detail?: string;
  group?: string;
  isDisabled?: boolean;
}

/** A row of an open dropdown: a group heading or an option, with its place among the options. */
export type SelectRow = { kind: 'group'; label: string } | { kind: 'option'; option: ISelectOption; index: number };
