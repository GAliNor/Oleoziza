export const formatKg = (kg: number): string => `${kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`;

export const formatQuintals = (kg: number): string => `${(kg / 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} q`;

export const formatDh = (amount: number): string =>
  `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

export const formatTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
