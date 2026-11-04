import { i18n } from '~/plugins/i18n';

import { ORIENTAL_PROVINCES } from 'territory/constants/provinces';
import type { ILocation, IProvince, ProvinceId } from 'territory/types/territory';

const sameName = (first: string, second: string): boolean => first.trim().localeCompare(second.trim(), 'fr', { sensitivity: 'base' }) === 0;

export const provinceById = (id: ProvinceId | null): IProvince | undefined => ORIENTAL_PROVINCES.find((province) => province.id === id);

/** The Province a known town belongs to; a town nobody listed has none. */
export const provinceOfCity = (city: string): IProvince | undefined => ORIENTAL_PROVINCES.find((province) => province.cities.some((known) => sameName(known, city)));

export const isSameCity = sameName;

export const isLocationComplete = (location: ILocation): boolean => !!location.province && !!location.city.trim() && !!location.address.trim();

/** Choosing a Province keeps a town typed by hand, and drops one known to belong elsewhere. */
export const withProvince = (location: ILocation, province: ProvinceId): ILocation => {
  const owner = provinceOfCity(location.city);
  return { ...location, province, city: owner && owner.id !== province ? '' : location.city };
};

/** Typing a known town fills in its Province when none is chosen yet. */
export const withCity = (location: ILocation, city: string): ILocation => ({ ...location, city, province: location.province ?? provinceOfCity(city)?.id ?? null });

export const formatArea = (id: ProvinceId | null): string => {
  const province = provinceById(id);
  const region = i18n.global.t('territory.region');
  return province ? `${i18n.global.t(`territory.${province.kind}`, { name: province.name })} · ${region}` : region;
};

export const trimmedLocation = (location: ILocation): ILocation => ({ province: location.province, city: location.city.trim(), address: location.address.trim() });
