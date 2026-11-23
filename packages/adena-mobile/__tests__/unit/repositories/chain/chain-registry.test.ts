import { ChainModule, ChainRegistry } from '../../../../src/repositories/chain/chain-registry';
import { BUILT_IN_NETWORKS } from '../../../../src/resources';

const gnoNetwork = BUILT_IN_NETWORKS.find(network => network.family === 'gno')!;
const cosmosNetwork = BUILT_IN_NETWORKS.find(network => network.family === 'cosmos')!;

const moduleOf = (family: ChainModule['family']): ChainModule => ({
  family,
  chain: { family } as never,
  assets: { family } as never,
  nfts: { family } as never,
  history: { family } as never,
});

describe('ChainRegistry', () => {
  it('resolves every repository of the network family', () => {
    const gno = moduleOf('gno');
    const registry = new ChainRegistry([gno, moduleOf('cosmos')]);

    expect(registry.module(gnoNetwork)).toBe(gno);
    expect(registry.forNetwork(gnoNetwork)).toBe(gno.chain);
    expect(registry.assets(gnoNetwork)).toBe(gno.assets);
    expect(registry.nfts(gnoNetwork)).toBe(gno.nfts);
    expect(registry.history(gnoNetwork)).toBe(gno.history);
    expect(registry.forNetwork(cosmosNetwork).family).toBe('cosmos');
  });

  it('lets a later module replace an earlier one of the same family', () => {
    const replacement = moduleOf('gno');

    expect(new ChainRegistry([moduleOf('gno'), replacement]).module(gnoNetwork)).toBe(replacement);
  });

  it('reports supported families and throws for unregistered ones', () => {
    const registry = new ChainRegistry([moduleOf('gno')]);

    expect(registry.supports('gno')).toBe(true);
    expect(registry.supports('cosmos')).toBe(false);
    expect(() => registry.module(cosmosNetwork)).toThrow('No chain module registered for cosmos');
    expect(() => registry.forNetwork(cosmosNetwork)).toThrow('No chain module registered for cosmos');
    expect(() => new ChainRegistry([]).assets(gnoNetwork)).toThrow('No chain module registered for gno');
  });
});
