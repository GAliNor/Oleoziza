import { mockResolve } from 'global/services/mock';
import { PROVINCES_MOCK } from 'territory/constants/mock-provinces';
import type { IProvince, ITerritoryService, ProvinceBoundary, ProvinceId } from 'territory/types/territory';

type OutlineCollection = { features: { properties: { id: ProvinceId }; geometry: ProvinceBoundary }[] };

/** The Provinces with their outlines; the outlines file is loaded on first use, so the API build never bundles it. */
export const readMockProvinces = async (): Promise<IProvince[]> => {
  const { default: outlines } = (await import('territory/constants/mock-province-outlines.json')) as unknown as { default: OutlineCollection };
  return PROVINCES_MOCK.map((province) => ({ ...province, boundary: outlines.features.find((feature) => feature.properties.id === province.id)?.geometry ?? null }));
};

export default class TerritoryMockService implements ITerritoryService {
  async getProvinces(): Promise<IProvince[]> {
    return mockResolve(await readMockProvinces());
  }
}
