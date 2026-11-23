import { ActivityFilterKind } from '../../../../src/domain/activity';
import { OnblocApiClient } from '../../../../src/infrastructure/http/onbloc-api.client';
import { FakeHttpClient } from '../../../helpers/fake-http';

const API = 'https://api.test';
const ADDR = 'g1abc';

describe('OnblocApiClient', () => {
  let http: FakeHttpClient;
  let client: OnblocApiClient;

  beforeEach(() => {
    http = new FakeHttpClient();
    client = new OnblocApiClient(http);
  });

  describe('unwrap', () => {
    it.each([
      ['unwrapped', { assets: [1] }],
      ['single data', { data: { assets: [1] } }],
      ['double data', { data: { data: { assets: [1] } } }],
    ])('accepts %s payloads', async (_label, body) => {
      http.on(`${API}/v1/accounts/${ADDR}`, body);
      await expect(client.getAccountAssets(`${API}/`, ADDR)).resolves.toEqual([1]);
    });

    it('stops after two levels of data', async () => {
      http.on(`${API}/v1/accounts/${ADDR}`, { data: { data: { data: { assets: [1] } } } });
      await expect(client.getAccountAssets(API, ADDR)).resolves.toEqual([]);
    });

    it.each([null, 'text', { data: null }, { data: 5 }])('tolerates %p bodies', async (body) => {
      http.on(`${API}/v1/prices`, body);
      await expect(client.getPrices(API)).resolves.toEqual([]);
    });
  });

  it('getAccountCollections returns items or empty', async () => {
    const url = `${API}/v1/accounts/${ADDR}/grc721-tokens`;

    http.on(url, { data: { items: [{ tokenId: 't' }] } });
    await expect(client.getAccountCollections(API, ADDR)).resolves.toEqual([{ tokenId: 't' }]);
    http.on(url, { data: {} });
    await expect(client.getAccountCollections(API, ADDR)).resolves.toEqual([]);
  });

  describe('getCollectionItems', () => {
    it('encodes the collection id and uses the default limit', async () => {
      http.on(`${API}/v1/accounts/${ADDR}/grc721-tokens/gno.land%2Fr%2Fnft/items?limit=100`, { data: { items: [1], page: { hasNext: true, cursor: 'c' } } });
      await expect(client.getCollectionItems(API, ADDR, 'gno.land/r/nft')).resolves.toEqual({ items: [1], page: { hasNext: true, cursor: 'c' } });
    });

    it('appends an encoded cursor and custom limit, defaulting missing fields', async () => {
      const url = `${API}/v1/accounts/${ADDR}/grc721-tokens/c/items?limit=5&cursor=a%26b`;

      http.on(url, {});
      await expect(client.getCollectionItems(API, ADDR, 'c', 'a&b', 5)).resolves.toEqual({ items: [], page: { hasNext: false } });
    });

    it('ignores a null cursor', async () => {
      http.on(`${API}/v1/accounts/${ADDR}/grc721-tokens/c/items?limit=100`, {});
      await expect(client.getCollectionItems(API, ADDR, 'c', null)).resolves.toEqual({ items: [], page: { hasNext: false } });
    });
  });

  describe('getTransactions', () => {
    it('targets the scope-specific endpoint', async () => {
      http.on(`${API}/v1/accounts/${ADDR}/transactions`, { data: { items: ['all'] } });
      http.on(`${API}/v1/accounts/${ADDR}/native-coin/transactions?cursor=x%2Fy`, { data: { items: ['native'], page: { hasNext: true } } });
      http.on(`${API}/v1/accounts/${ADDR}/grc20-token/gno.land%2Fr%2Ffoo.FOO/transactions`, {});

      await expect(client.getTransactions(API, ADDR, { kind: ActivityFilterKind.ALL })).resolves.toEqual({ items: ['all'], page: { hasNext: false } });
      await expect(client.getTransactions(API, ADDR, { kind: ActivityFilterKind.NATIVE }, 'x/y')).resolves.toEqual({ items: ['native'], page: { hasNext: true } });
      await expect(client.getTransactions(API, ADDR, { kind: ActivityFilterKind.GRC20, tokenKey: 'gno.land/r/foo.FOO' }, null))
        .resolves.toEqual({ items: [], page: { hasNext: false } });
    });
  });

  it('getPrices returns items', async () => {
    http.on(`${API}/v1/prices`, { data: { items: [{ assetId: 'a' }] } });
    await expect(client.getPrices(API)).resolves.toEqual([{ assetId: 'a' }]);
  });

  it('propagates transport errors', async () => {
    await expect(client.getPrices(API)).rejects.toThrow('404');
  });
});
