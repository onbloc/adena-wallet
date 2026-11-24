import { CosmosLcdClient } from '../../../../../src/infrastructure/http/cosmos-lcd.client';
import { CosmosAssetRepository } from '../../../../../src/repositories/chain/cosmos/cosmos-asset.repository';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { FakeHttpClient } from '../../../../helpers/fake-http';

const network = BUILT_IN_NETWORKS.find(item => item.id === 'atomone-1')!;
const ADDRESS = 'atone1jg8mtutu9khhfwc4nxmuhcpftf0pajdhn6qkzq';
const balancesUrl = `${network.restUrl}/cosmos/bank/v1beta1/balances/${ADDRESS}`;

const setup = () => {
  const http = new FakeHttpClient();

  return { http, repository: new CosmosAssetRepository(new CosmosLcdClient(http)) };
};

describe('CosmosAssetRepository', () => {
  it('lists the bundled coins', async () => {
    const { repository } = setup();
    const tokens = await repository.getCuratedTokens(network);

    expect(repository.family).toBe('cosmos');
    expect(tokens.map(token => [token.id, token.symbol, token.decimals])).toEqual([['uatone', 'ATONE', 6], ['uphoton', 'PHOTON', 6]]);
  });

  it('finds bundled coins only', async () => {
    const { repository } = setup();

    await expect(repository.findToken('uphoton', network)).resolves.toMatchObject({ id: 'uphoton', isNative: true });
    await expect(repository.findToken('ugnot', network)).resolves.toBeNull();
  });

  it('has no registry and discovers nothing', async () => {
    const { repository } = setup();

    await expect(repository.searchRegistry()).resolves.toEqual({ tokens: [], total: 0 });
    await expect(repository.discoverHeldTokens()).resolves.toEqual([]);
  });

  it('reads balances, treating missing denoms as zero', async () => {
    const { repository, http } = setup();
    const tokens = await repository.getCuratedTokens(network);

    http.on(balancesUrl, { balances: [{ denom: 'uatone', amount: '123456789012345678901234567890' }, { denom: 'ibc/X', amount: '1' }] });
    await expect(repository.getBalances(ADDRESS, tokens, network)).resolves.toEqual({ uatone: '123456789012345678901234567890', uphoton: '0' });
    http.on(balancesUrl, {});
    await expect(repository.getBalances(ADDRESS, tokens, network)).resolves.toEqual({ uatone: '0', uphoton: '0' });
    await expect(repository.getBalances(ADDRESS, [], network)).resolves.toEqual({});
  });

  it('queries a relative url without a REST endpoint and propagates failures', async () => {
    const { repository, http } = setup();

    await expect(repository.getBalances(ADDRESS, [], { ...network, restUrl: undefined })).rejects.toThrow('404');
    expect(http.calls).toEqual([`/cosmos/bank/v1beta1/balances/${ADDRESS}`]);
  });

  it('builds amino MsgSend transfers', async () => {
    const { repository } = setup();
    const [atone] = await repository.getCuratedTokens(network);

    await expect(repository.buildTransferMessages({ network, fromAddress: ADDRESS, toAddress: 'atone1to', token: atone, amount: '1000' })).resolves.toEqual([
      { type: 'cosmos-sdk/MsgSend', value: { from_address: ADDRESS, to_address: 'atone1to', amount: [{ denom: 'uatone', amount: '1000' }] } },
    ]);
    await expect(repository.buildTransferMessages({ network, fromAddress: ADDRESS, toAddress: 'atone1to', token: { ...atone, id: 'ibc/X', denom: undefined }, amount: '1' }))
      .resolves.toMatchObject([{ value: { amount: [{ denom: 'ibc/X', amount: '1' }] } }]);
  });
});
