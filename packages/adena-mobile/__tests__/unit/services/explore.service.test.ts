import { ChainFamily } from '../../../src/domain/network';
import { EXPLORE_APPS, ExploreApp } from '../../../src/resources';
import { ExploreService } from '../../../src/services/explore.service';
import { COSMOS_NETWORK, GNO_NETWORK } from '../../helpers/service-fakes';

const app = (id: string, families: ExploreApp['families']): ExploreApp => ({
  id, name: id, description: '', logo: id, url: `https://${id}.example`, families, order: 0,
});

describe('ExploreService', () => {
  it('lists only the apps curated for the network family', () => {
    const service = new ExploreService([app('gno-only', [ChainFamily.GNO]), app('both', [ChainFamily.GNO, ChainFamily.COSMOS]), app('cosmos-only', [ChainFamily.COSMOS])]);

    expect(service.getApps(GNO_NETWORK).map(item => item.id)).toEqual(['gno-only', 'both']);
    expect(service.getApps(COSMOS_NETWORK).map(item => item.id)).toEqual(['both', 'cosmos-only']);
  });

  it('defaults to the bundled apps', () => {
    const service = new ExploreService();

    expect(service.getApps(GNO_NETWORK)).toEqual(EXPLORE_APPS.filter(item => item.families.includes(ChainFamily.GNO)));
    expect(service.getApps(GNO_NETWORK).length).toBeGreaterThan(0);
  });

  it('returns nothing when no app targets the family', () => {
    expect(new ExploreService([]).getApps(GNO_NETWORK)).toEqual([]);
  });
});
