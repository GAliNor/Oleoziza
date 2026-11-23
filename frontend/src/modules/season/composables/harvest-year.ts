/** The year a Season is named after: a harvest starts in autumn, or in the winter that follows. */
export const harvestYear = (startsOn: string): number => Number(startsOn.slice(0, 4)) - (Number(startsOn.slice(5, 7)) >= 7 ? 0 : 1);
