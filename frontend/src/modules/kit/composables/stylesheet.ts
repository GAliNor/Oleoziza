export interface IToken {
  name: string;
  variable: string;
  value: string;
}

/** Reads `--<namespace>-<name>: value;` declarations from a stylesheet, skipping `--<namespace>-*` resets. */
export const readTokens = (css: string, namespace: string): IToken[] =>
  [...css.matchAll(new RegExp(`(--${namespace}-([a-z0-9-]+)):\\s*([^;]+);`, 'g'))].map(([, variable, name, value]) => ({ name, variable, value: value.trim() }));

/** Lists the classes a stylesheet defines, once each, without their states or pseudo elements. */
export const readClasses = (css: string): string[] => [...new Set([...css.matchAll(/^\s*\.([a-z][a-z0-9-]*)[^{]*?[,{]\s*$/gm)].map(([, name]) => name))];
