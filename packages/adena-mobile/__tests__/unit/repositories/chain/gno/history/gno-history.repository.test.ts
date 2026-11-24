import { OnblocApiClient, TransactionHistoryItem } from '../../../../../../src/infrastructure/http/onbloc-api.client';
import { GnoHistoryRepository } from '../../../../../../src/repositories/chain/gno/history/gno-history.repository';
import { BUILT_IN_NETWORKS } from '../../../../../../src/resources';
import { FakeHttpClient } from '../../../../../helpers/fake-http';

const network = BUILT_IN_NETWORKS[0];
const API = network.apiUrl!;
const ME = 'g1me';
const FOO = 'gno.land/r/demo/foo.FOO';

const item: TransactionHistoryItem = {
  amountIn: { denom: 'ugnot', value: '5' },
  amountOut: { denom: 'ugnot', value: '0' },
  blockHeight: 10,
  fee: { denom: 'ugnot', value: '1000' },
  func: [{ funcType: '', messageType: '/bank.MsgSend', pkgPath: '' }],
  isGRC20Transfer: false,
  isGRC721Transfer: false,
  messageCount: 1,
  successYn: true,
  timestamp: '2026-11-20T10:00:00Z',
  fromAddress: 'g1other',
  toAddress: ME,
  txHash: 'ab'.repeat(32),
};

const setup = () => {
  const http = new FakeHttpClient();

  return { http, repository: new GnoHistoryRepository(new OnblocApiClient(http)) };
};

describe('GnoHistoryRepository', () => {
  it('is supported only with an API url', () => {
    const { repository } = setup();

    expect(repository.family).toBe('gno');
    expect(repository.isSupported(network)).toBe(true);
    expect(repository.isSupported({ ...network, apiUrl: undefined })).toBe(false);
    expect(repository.isSupported({ ...network, apiUrl: '' })).toBe(false);
  });

  it('returns an empty last page without an API', async () => {
    const { repository, http } = setup();

    await expect(repository.getActivities(ME, { ...network, apiUrl: undefined }, { kind: 'all' })).resolves.toEqual({ items: [], cursor: null, hasNext: false });
    expect(http.calls).toHaveLength(0);
  });

  it('maps every transaction and forwards the cursor', async () => {
    const { repository, http } = setup();

    http
      .on(`${API}/v1/accounts/${ME}/transactions`, { data: { items: [item, { ...item, toAddress: 'g1x', fromAddress: ME }], page: { hasNext: true, cursor: 'c1' } } })
      .on(`${API}/v1/accounts/${ME}/transactions?cursor=c1`, { data: { items: [], page: { hasNext: false } } });
    const first = await repository.getActivities(ME, network, { kind: 'all' });

    expect(first.items.map(activity => activity.title)).toEqual(['Receive', 'Send']);
    expect(first).toMatchObject({ cursor: 'c1', hasNext: true });
    await expect(repository.getActivities(ME, network, { kind: 'all' }, 'c1')).resolves.toEqual({ items: [], cursor: null, hasNext: false });
  });

  it('scopes native and GRC20 filters', async () => {
    const { repository, http } = setup();

    http
      .on(`${API}/v1/accounts/${ME}/native-coin/transactions`, { data: { items: [item], page: { hasNext: false, cursor: null } } })
      .on(`${API}/v1/accounts/${ME}/grc20-token/${encodeURIComponent(FOO)}/transactions`, { data: {} });

    await expect(repository.getActivities(ME, network, { kind: 'native', denom: 'ugnot' })).resolves.toMatchObject({ items: [{ type: 'TRANSFER' }], cursor: null });
    await expect(repository.getActivities(ME, network, { kind: 'grc20', tokenId: FOO, pkgPath: 'gno.land/r/demo/foo' })).resolves.toEqual({ items: [], cursor: null, hasNext: false });
  });

  it('propagates API failures', async () => {
    await expect(setup().repository.getActivities(ME, network, { kind: 'all' })).rejects.toThrow('404');
  });
});
