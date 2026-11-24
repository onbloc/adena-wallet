import { NftCollection } from '../../../../../src/domain/nft';
import { OnblocApiClient } from '../../../../../src/infrastructure/http/onbloc-api.client';
import { GnoNftRepository } from '../../../../../src/repositories/chain/gno/gno-nft.repository';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { createFakeGnoProvider } from '../../../../helpers/fake-gno-provider';
import { FakeHttpClient } from '../../../../helpers/fake-http';

const network = BUILT_IN_NETWORKS[0];
const API = network.apiUrl!;
const OWNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const PKG = 'gno.land/r/demo/nft';
const collectionsUrl = `${API}/v1/accounts/${OWNER}/grc721-tokens`;
const itemsUrl = (id: string, query: string) => `${API}/v1/accounts/${OWNER}/grc721-tokens/${encodeURIComponent(id)}/items${query}`;

const collection = (overrides: Record<string, unknown> = {}) => ({ tokenId: `${PKG}.NFT.1`, packagePath: PKG, name: 'Demo', symbol: 'NFT', tokenCount: 1, ownedCount: 1, ...overrides });

const setup = () => {
  const gno = createFakeGnoProvider();
  const http = new FakeHttpClient();

  return { gno, http, repository: new GnoNftRepository(gno.factory, new OnblocApiClient(http)) };
};

const stringResult = (value: string) => `(${JSON.stringify(value)} string)\n(undefined)`;

describe('GnoNftRepository', () => {
  it('is the gno family', () => {
    expect(setup().repository.family).toBe('gno');
  });

  describe('getCollections', () => {
    it('lists nothing without an API', async () => {
      await expect(setup().repository.getCollections(OWNER, { ...network, apiUrl: undefined })).resolves.toEqual([]);
    });

    it('groups owned entries per realm and detects capabilities', async () => {
      const { repository, http, gno } = setup();

      http
        .on(collectionsUrl, {
          data: {
            items: [
              collection({ tokenCount: 2, ownedCount: 2 }),
              collection({ tokenId: `${PKG}.NFT.2`, name: 'Later', symbol: 'L', tokenCount: 3, ownedCount: 3 }),
              collection({ tokenId: '', packagePath: 'gno.land/r/demo/other', name: 'Other', symbol: 'O' }),
              collection({ packagePath: 'gno.land/r/demo/empty', tokenCount: 0, ownedCount: 0 }),
              collection({ packagePath: 'gno.land/r/demo/staked', tokenCount: 1, ownedCount: 0 }),
            ],
          },
        })
        .on(itemsUrl(`${PKG}.NFT.1`, '?limit=1'), { data: { items: [{ nftId: '9' }], page: { hasNext: true } } })
        .on(itemsUrl('gno.land/r/demo/other', '?limit=1'), { data: { items: [], page: { hasNext: false } } });
      gno.state.signatures[PKG] = [
        { FuncName: 'TokenURI', Results: [{ Type: 'string' }] },
        { FuncName: 'TokenMetadata', Results: [{ Type: 'string' }] },
      ];
      gno.state.signatures['gno.land/r/demo/other'] = [
        { FuncName: 'TokenURI', Results: [{ Type: 'int' }] },
        { FuncName: 'TokenMetadata', Results: [] },
        { FuncName: 'Other', Results: [{ Type: 'string' }] },
      ];
      const collections = await repository.getCollections(OWNER, network);

      expect(collections).toEqual([
        { id: `${PKG}.NFT.1`, collectionIds: [`${PKG}.NFT.1`, `${PKG}.NFT.2`], packagePath: PKG, name: 'Demo', symbol: 'NFT', ownedCount: 5, thumbnailNftId: '9', supportsTokenUri: true, supportsMetadata: true },
        { id: 'gno.land/r/demo/other', collectionIds: ['gno.land/r/demo/other'], packagePath: 'gno.land/r/demo/other', name: 'Other', symbol: 'O', ownedCount: 1, thumbnailNftId: undefined, supportsTokenUri: false, supportsMetadata: false },
      ]);
    });

    it('tolerates a missing thumbnail and keeps capabilities on when detection fails', async () => {
      const { repository, http, gno } = setup();

      http.on(collectionsUrl, { data: { items: [collection()] } });
      (gno.provider as unknown as { getFunctionSignatures: unknown }).getFunctionSignatures = async () => {
        throw new Error('rpc down');
      };

      await expect(repository.getCollections(OWNER, network)).resolves.toEqual([
        { id: `${PKG}.NFT.1`, collectionIds: [`${PKG}.NFT.1`], packagePath: PKG, name: 'Demo', symbol: 'NFT', ownedCount: 1, thumbnailNftId: undefined, supportsTokenUri: true, supportsMetadata: true },
      ]);
    });

    it('counts owned tokens only and skips an operated-only thumbnail', async () => {
      const { repository, http } = setup();

      http
        .on(collectionsUrl, { data: { items: [collection({ tokenCount: 3, ownedCount: 1 })] } })
        .on(itemsUrl(`${PKG}.NFT.1`, '?limit=1'), { data: { items: [{ nftId: '9', isOwned: false, ownerAddress: 'g1staker' }], page: { hasNext: true } } });

      await expect(repository.getCollections(OWNER, network)).resolves.toMatchObject([{ ownedCount: 1, thumbnailNftId: undefined }]);
    });

    it('returns [] for an empty listing and propagates listing failures', async () => {
      const { repository, http } = setup();

      await expect(repository.getCollections(OWNER, network)).rejects.toThrow('404');
      http.on(collectionsUrl, { data: {} });
      await expect(repository.getCollections(OWNER, network)).resolves.toEqual([]);
    });
  });

  describe('getItems', () => {
    const owned: NftCollection = { id: `${PKG}.NFT.1`, packagePath: PKG, name: 'Demo', symbol: 'NFT', ownedCount: 2, supportsTokenUri: true, supportsMetadata: false };

    it('returns an empty last page without an API', async () => {
      await expect(setup().repository.getItems(OWNER, owned, { ...network, apiUrl: undefined })).resolves.toEqual({ items: [], cursor: null, hasNext: false });
    });

    it('maps items with collection fallbacks and paginates by cursor', async () => {
      const { repository, http } = setup();

      http
        .on(itemsUrl(owned.id, '?limit=100'), {
          data: {
            items: [
              { nftId: '1', packagePath: '', name: '', symbol: '' },
              { nftId: '2', packagePath: 'gno.land/r/demo/alt', name: 'Named', symbol: 'N2' },
            ],
            page: { hasNext: true, cursor: 'next' },
          },
        })
        .on(itemsUrl(owned.id, '?limit=100&cursor=next'), { data: { items: [{ nftId: '3' }], page: { hasNext: false } } });

      await expect(repository.getItems(OWNER, owned, network)).resolves.toEqual({
        items: [
          { collectionId: owned.id, packagePath: PKG, nftId: '1', name: 'Demo', symbol: 'NFT' },
          { collectionId: owned.id, packagePath: 'gno.land/r/demo/alt', nftId: '2', name: 'Named', symbol: 'N2' },
        ],
        cursor: '0:next',
        hasNext: true,
      });
      await expect(repository.getItems(OWNER, owned, network, '0:next')).resolves.toMatchObject({ cursor: null, hasNext: false, items: [{ nftId: '3' }] });
    });

    it('walks every collection of the realm in turn', async () => {
      const { repository, http } = setup();
      const realm = { ...owned, collectionIds: [`${PKG}.NFT.1`, `${PKG}.NFT.2`] };

      http
        .on(itemsUrl(`${PKG}.NFT.1`, '?limit=100'), { data: { items: [{ nftId: '1' }], page: { hasNext: false } } })
        .on(itemsUrl(`${PKG}.NFT.2`, '?limit=100'), { data: { items: [{ nftId: '2' }], page: { hasNext: false } } });

      const first = await repository.getItems(OWNER, realm, network);

      expect(first).toMatchObject({ items: [{ nftId: '1' }], cursor: '1:', hasNext: true });
      await expect(repository.getItems(OWNER, realm, network, first.cursor)).resolves.toMatchObject({ items: [{ nftId: '2' }], cursor: null, hasNext: false });
    });

    it('excludes operated-only tokens and reads past pages left empty by them', async () => {
      const { repository, http } = setup();

      http
        .on(itemsUrl(owned.id, '?limit=100'), { data: { items: [{ nftId: '1', isOwned: false, ownerAddress: 'g1staker' }], page: { hasNext: true, cursor: 'c2' } } })
        .on(itemsUrl(owned.id, '?limit=100&cursor=c2'), { data: { items: [{ nftId: '2', isOwned: true }, { nftId: '3', isOwned: false }], page: { hasNext: false } } });

      await expect(repository.getItems(OWNER, owned, network)).resolves.toEqual({
        items: [{ collectionId: owned.id, packagePath: PKG, nftId: '2', name: 'Demo', symbol: 'NFT' }],
        cursor: null,
        hasNext: false,
      });
    });

    it('treats a missing page as the end', async () => {
      const { repository, http } = setup();

      http.on(itemsUrl(owned.id, '?limit=100'), { data: {} });
      await expect(repository.getItems(OWNER, owned, network, null)).resolves.toEqual({ items: [], cursor: null, hasNext: false });
    });
  });

  describe('getTokenUri', () => {
    it('evaluates TokenURI with an escaped id', async () => {
      const { repository, gno } = setup();
      const calls: string[] = [];

      gno.state.evaluate = (pkgPath, expression) => {
        calls.push(`${pkgPath}|${expression}`);
        return stringResult('https://img/1.png');
      };

      await expect(repository.getTokenUri(PKG, '1"x', network)).resolves.toBe('https://img/1.png');
      expect(calls).toEqual([`${PKG}|TokenURI("1\\"x")`]);
    });

    it('returns null for error tuples, empty results and failures', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => '("" string)\n(&errors.errorString{s:"invalid"} *errors.errorString)';
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBeNull();
      gno.state.evaluate = () => stringResult('');
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBeNull();
      gno.state.evaluate = () => '';
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBeNull();
      gno.state.evaluate = () => 'garbage without tuples';
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBeNull();
      gno.state.evaluate = () => {
        throw new Error('panic');
      };

      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBeNull();
    });

    it('accepts a result without an error tuple', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => '("ipfs://x" string)';
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBe('ipfs://x');
    });

    it('enforces the 2 MiB size limit', async () => {
      const { repository, gno } = setup();
      const limit = 2 * 1024 * 1024;

      gno.state.evaluate = () => stringResult(`data:${'a'.repeat(limit - 5)}`);
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toHaveLength(limit);
      gno.state.evaluate = () => stringResult(`data:${'a'.repeat(limit - 4)}`);
      await expect(repository.getTokenUri(PKG, '1', network)).resolves.toBeNull();
    });
  });

  describe('getMetadata', () => {
    const metadataOf = async (json: string) => {
      const { repository, gno } = setup();

      gno.state.evaluate = (_, expression) => (expression.startsWith('TokenMetadata(') ? stringResult(json) : '');
      return repository.getMetadata(PKG, '1', network);
    };

    it('maps snake_case metadata and filters empty attributes', async () => {
      await expect(metadataOf(JSON.stringify({
        name: 'One',
        description: 'First',
        image: 'https://img/1.png',
        external_url: 'https://x',
        attributes: [{ trait_type: 'Color', value: 'Red' }, { trait_type: '', value: '' }, { value: 3 }, {}],
      }))).resolves.toEqual({
        name: 'One',
        description: 'First',
        image: 'https://img/1.png',
        externalUrl: 'https://x',
        attributes: [{ traitType: 'Color', value: 'Red' }, { traitType: '', value: '3' }],
      });
    });

    it('falls back across image and url aliases', async () => {
      await expect(metadataOf(JSON.stringify({ image: '', image_data: '<svg/>', externalUrl: 'https://y', attributes: [{ traitType: 'Size', value: 'L' }] })))
        .resolves.toEqual({ name: undefined, description: undefined, image: '<svg/>', externalUrl: 'https://y', attributes: [{ traitType: 'Size', value: 'L' }] });
      await expect(metadataOf(JSON.stringify({ name: 5, imageData: 'data:x', attributes: 'nope' })))
        .resolves.toEqual({ name: undefined, description: undefined, image: 'data:x', externalUrl: undefined, attributes: [] });
    });

    it('returns null for invalid JSON, empty results and query failures', async () => {
      await expect(metadataOf('{not json')).resolves.toBeNull();
      await expect(metadataOf('')).resolves.toBeNull();
      await expect(metadataOf('null')).resolves.toBeNull();

      const { repository, gno } = setup();

      gno.state.evaluate = () => {
        throw new Error('panic');
      };

      await expect(repository.getMetadata(PKG, '1', network)).resolves.toBeNull();
    });

    // A single null attribute makes `item.trait_type` throw, so the whole metadata is dropped.
    it.todo('skips null attribute entries instead of discarding all metadata');
  });

  describe('buildTransferMessages', () => {
    it('calls TransferFrom(from, to, tid) on the collection realm', () => {
      expect(setup().repository.buildTransferMessages({ network, fromAddress: OWNER, toAddress: 'g1to', packagePath: PKG, nftId: '7' })).toEqual([{
        type: '/vm.m_call',
        value: { caller: OWNER, send: '', max_deposit: '', pkg_path: PKG, func: 'TransferFrom', args: [OWNER, 'g1to', '7'] },
      }]);
    });
  });
});
