import { GnoAssetRepository } from '../../../../../src/repositories/chain/gno/gno-asset.repository';
import { GnoChainRepository } from '../../../../../src/repositories/chain/gno/gno-chain.repository';
import { createGnoModule } from '../../../../../src/repositories/chain/gno/gno-module';
import { GnoNftRepository } from '../../../../../src/repositories/chain/gno/gno-nft.repository';
import { GnoHistoryRepository } from '../../../../../src/repositories/chain/gno/history/gno-history.repository';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { createFakeGnoProvider } from '../../../../helpers/fake-gno-provider';
import { FakeHttpClient } from '../../../../helpers/fake-http';

describe('createGnoModule', () => {
  it('wires every gno repository to the shared provider factory and http client', async () => {
    const gno = createFakeGnoProvider({ chainId: 'gnoland-1' });
    const http = new FakeHttpClient();
    const module = createGnoModule({ providerFactory: gno.factory, http });
    const network = BUILT_IN_NETWORKS[0];

    expect(module.family).toBe('gno');
    expect(module.chain).toBeInstanceOf(GnoChainRepository);
    expect(module.assets).toBeInstanceOf(GnoAssetRepository);
    expect(module.nfts).toBeInstanceOf(GnoNftRepository);
    expect(module.history).toBeInstanceOf(GnoHistoryRepository);
    expect([module.chain.family, module.assets.family, module.nfts.family, module.history.family]).toEqual(['gno', 'gno', 'gno', 'gno']);

    await expect(module.chain.getChainId(network)).resolves.toBe('gnoland-1');
    // The fake http has no responses, so the list is incomplete and rejected.
    await expect(module.assets.getCuratedTokens(network)).rejects.toThrow('The token list is unavailable');
    expect(http.calls.some(url => url.endsWith(`/grc20/${network.id}.json`))).toBe(true);
  });
});
