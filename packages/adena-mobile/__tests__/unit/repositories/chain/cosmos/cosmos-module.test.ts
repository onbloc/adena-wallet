import { CosmosAssetRepository } from '../../../../../src/repositories/chain/cosmos/cosmos-asset.repository';
import { CosmosChainRepository } from '../../../../../src/repositories/chain/cosmos/cosmos-chain.repository';
import { createCosmosModule } from '../../../../../src/repositories/chain/cosmos/cosmos-module';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { FakeHttpClient } from '../../../../helpers/fake-http';

const network = BUILT_IN_NETWORKS.find(item => item.id === 'atomone-1')!;

describe('createCosmosModule', () => {
  const module = createCosmosModule({ http: new FakeHttpClient() });

  it('wires the cosmos chain and asset repositories', () => {
    expect(module.family).toBe('cosmos');
    expect(module.chain).toBeInstanceOf(CosmosChainRepository);
    expect(module.assets).toBeInstanceOf(CosmosAssetRepository);
  });

  it('reports NFTs as unsupported', async () => {
    const collection = { id: 'c', packagePath: 'p', name: 'n', symbol: 's', ownedCount: 1, supportsTokenUri: false, supportsMetadata: false };

    expect(module.nfts.family).toBe('cosmos');
    await expect(module.nfts.getCollections('atone1x', network)).resolves.toEqual([]);
    await expect(module.nfts.getItems('atone1x', collection, network)).resolves.toEqual({ items: [], cursor: null, hasNext: false });
    await expect(module.nfts.getTokenUri('p', '1', network)).resolves.toBeNull();
    await expect(module.nfts.getMetadata('p', '1', network)).resolves.toBeNull();
    expect(() => module.nfts.buildTransferMessages({ network, fromAddress: 'a', toAddress: 'b', packagePath: 'p', nftId: '1' }))
      .toThrow('NFT transfers are not supported on this chain');
  });

  it('reports history as unsupported', async () => {
    expect(module.history.family).toBe('cosmos');
    expect(module.history.isSupported(network)).toBe(false);
    await expect(module.history.getActivities('atone1x', network, { kind: 'all' })).resolves.toEqual({ items: [], cursor: null, hasNext: false });
  });
});
