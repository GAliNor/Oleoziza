export interface IUiTableColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
  format?: (value: unknown) => string;
}
