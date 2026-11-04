/** A design token's current value, for what cannot paint with a class, such as a map's canvas. */
export const readCssToken = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
