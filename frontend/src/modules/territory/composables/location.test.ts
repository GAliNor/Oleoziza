import { describe, expect, it } from 'vitest';

import { formatArea, isLocationComplete, provinceOfCity, trimmedLocation, withCity, withProvince } from 'territory/composables/location';
import { PROVINCES_MOCK } from 'territory/constants/mock-provinces';
import { readMockProvinces } from 'territory/services/territory.mock';

const PROVINCES = PROVINCES_MOCK;
const byId = (id: string) => PROVINCES.find((province) => province.id === id);

describe('provinceOfCity', () => {
  it('finds a known town, whatever its case and accents', () => {
    expect([provinceOfCity(PROVINCES, 'ahfir')?.id, provinceOfCity(PROVINCES, ' SAIDIA ')?.id, provinceOfCity(PROVINCES, 'Bouarfa')?.id]).toEqual(['berkane', 'berkane', 'figuig']);
  });

  it('knows nothing of a town nobody listed', () => {
    expect(provinceOfCity(PROVINCES, 'Douar Inconnu')).toBeUndefined();
  });
});

describe('withProvince', () => {
  it('drops a town known to belong to another Province', () => {
    expect(withProvince(PROVINCES, { province: 'berkane', city: 'Ahfir', address: '12 rue' }, 'nador')).toEqual({ province: 'nador', city: '', address: '12 rue' });
  });

  it('keeps a town of that Province, and one typed by hand', () => {
    expect(withProvince(PROVINCES, { province: null, city: 'Ahfir', address: '' }, 'berkane').city).toBe('Ahfir');
    expect(withProvince(PROVINCES, { province: 'berkane', city: 'Douar Inconnu', address: '' }, 'nador').city).toBe('Douar Inconnu');
  });
});

describe('withCity', () => {
  it('fills in the Province of a known town when none is chosen', () => {
    expect(withCity(PROVINCES, { province: null, city: '', address: '' }, 'Debdou').province).toBe('taourirt');
  });

  it('never replaces a Province already chosen', () => {
    expect(withCity(PROVINCES, { province: 'nador', city: '', address: '' }, 'Debdou').province).toBe('nador');
  });
});

describe('isLocationComplete', () => {
  it('needs the Province, the town and the address', () => {
    expect(isLocationComplete({ province: 'nador', city: 'Nador', address: '12 rue' })).toBe(true);
    expect(isLocationComplete({ province: null, city: 'Nador', address: '12 rue' })).toBe(false);
    expect(isLocationComplete({ province: 'nador', city: '  ', address: '12 rue' })).toBe(false);
    expect(isLocationComplete({ province: 'nador', city: 'Nador', address: ' ' })).toBe(false);
  });
});

describe('trimmedLocation', () => {
  it('cleans what was typed', () => {
    expect(trimmedLocation({ province: 'nador', city: ' Nador ', address: ' 12 rue ' })).toEqual({ province: 'nador', city: 'Nador', address: '12 rue' });
  });
});

describe('formatArea', () => {
  it('names a Province and a Prefecture as they are', () => {
    expect([formatArea(byId('jerada')), formatArea(byId('oujda-angad')), formatArea(undefined)]).toEqual(['Province de Jerada · Région de l’Oriental', 'Préfecture d’Oujda-Angad · Région de l’Oriental', 'Région de l’Oriental']);
  });
});

describe('the Oriental data', () => {
  it('has one outline for each Province, and each town once', async () => {
    const provinces = await readMockProvinces();
    expect(provinces.every((province) => province.boundary !== null)).toBe(true);
    const towns = PROVINCES.flatMap((province) => province.cities);
    expect(new Set(towns).size).toBe(towns.length);
  });
});
