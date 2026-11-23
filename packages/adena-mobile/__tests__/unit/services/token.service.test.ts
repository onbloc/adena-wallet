import { fromBase64 } from '@cosmjs/encoding';

import { isAppError } from '../../../src/core/errors';
import { ManagedToken, TokenSource } from '../../../src/domain/token';
import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { StorageTokenListRepository } from '../../../src/repositories/token-list.repository';
import { getDefaultTokensFor } from '../../../src/resources';
import { AccountService } from '../../../src/services/account.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { TokenService } from '../../../src/services/token.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { catchError, COSMOS_NETWORK, createFakeRegistry, fakeAddress, GNO_NETWORK, makeAccount, makeToken, networkById } from '../../helpers/service-fakes';

const setup = () => {
  const { registry, modules } = createFakeRegistry();
  const accountService = new AccountService(new StorageAccountRepository(new MemoryKeyValueStore()), new KeyringSession(), registry);
  const repository = new StorageTokenListRepository(new MemoryKeyValueStore());

  return { service: new TokenService(registry, accountService, repository), repository, assets: modules.gno.assets, cosmosAssets: modules.cosmos.assets };
};

const managed = (overrides: Partial<ManagedToken> = {}): ManagedToken => ({ ...makeToken(), visible: true, source: TokenSource.CUSTOM, ...overrides });

describe('TokenService', () => {
  const account = makeAccount();
  const address = fakeAddress(fromBase64(account.publicKey), GNO_NETWORK);
  const gnot = getDefaultTokensFor(GNO_NETWORK)[0];

  describe('getTokenList', () => {
    it('always lists the network coins first, enriched by curated metadata', async () => {
      const { service, repository, assets } = setup();

      assets.getCuratedTokens.mockResolvedValue([{ ...gnot, description: 'Native coin' }]);
      const list = await service.getTokenList(account, GNO_NETWORK);

      expect(list).toEqual([{ ...gnot, description: 'Native coin', visible: true, source: 'default' }]);
      expect(repository.get(account.id, GNO_NETWORK.id)).toEqual(list);
      expect(assets.discoverHeldTokens).toHaveBeenCalledWith(address, GNO_NETWORK);
    });

    it('lists both coins on AtomOne', async () => {
      const { service } = setup();

      expect((await service.getTokenList(account, COSMOS_NETWORK)).map(token => token.id)).toEqual(['uatone', 'uphoton']);
    });

    it('keeps stored user tokens, ignores stale stored coins and adds new discoveries', async () => {
      const { service, repository, assets } = setup();
      const custom = managed({ id: 'custom', visible: false });
      const discoveredKnown = makeToken({ id: 'custom', name: 'Discovered copy' });
      const discoveredNew = makeToken({ id: 'fresh' });

      repository.save(account.id, GNO_NETWORK.id, [managed({ ...gnot, visible: false, source: 'default' }), custom]);
      assets.discoverHeldTokens.mockResolvedValue([discoveredKnown, discoveredNew]);
      const list = await service.getTokenList(account, GNO_NETWORK);

      expect(list.map(token => [token.id, token.visible, token.source])).toEqual([
        ['ugnot', true, 'default'],
        ['custom', false, 'custom'],
        ['fresh', true, 'discovered'],
      ]);
      expect(list[1].name).toBe('Foo');
    });

    it('refreshes metadata from resources but keeps visibility and source', async () => {
      const { service, repository, assets } = setup();

      repository.save(account.id, GNO_NETWORK.id, [managed({ id: 'foo', name: 'Old', visible: false, source: 'discovered' })]);
      assets.getCuratedTokens.mockResolvedValue([makeToken({ id: 'foo', name: 'New' })]);
      const [, foo] = await service.getTokenList(account, GNO_NETWORK);

      expect(foo).toMatchObject({ id: 'foo', name: 'New', visible: false, source: 'discovered' });
    });

    it('falls back to stored tokens when resources and discovery fail', async () => {
      const { service, repository, assets } = setup();

      repository.save(account.id, GNO_NETWORK.id, [managed({ id: 'foo' })]);
      assets.getCuratedTokens.mockRejectedValue(new Error('down'));
      assets.discoverHeldTokens.mockRejectedValue(new Error('down'));
      expect((await service.getTokenList(account, GNO_NETWORK)).map(token => token.id)).toEqual(['ugnot', 'foo']);
    });

    it('keeps lists separate per network', async () => {
      const { service, repository } = setup();

      repository.save(account.id, GNO_NETWORK.id, [managed({ id: 'foo' })]);
      expect((await service.getTokenList(account, networkById('onyx-1'))).map(token => token.id)).toEqual(['ugnot']);
    });
  });

  describe('getStoredToken', () => {
    it('returns coins without a stored list', () => {
      expect(setup().service.getStoredToken(account, GNO_NETWORK, 'ugnot')).toEqual({ ...gnot, visible: true, source: 'default' });
    });

    it('returns stored tokens and undefined otherwise', () => {
      const { service, repository } = setup();

      expect(service.getStoredToken(account, GNO_NETWORK, 'foo')).toBeUndefined();
      repository.save(account.id, GNO_NETWORK.id, [managed({ id: 'foo' })]);
      expect(service.getStoredToken(account, GNO_NETWORK, 'foo')?.id).toBe('foo');
      expect(service.getStoredToken(account, GNO_NETWORK, 'bar')).toBeUndefined();
    });
  });

  describe('setVisibility', () => {
    it('toggles tokens but never hides coins', () => {
      const { service, repository } = setup();

      repository.save(account.id, GNO_NETWORK.id, [managed({ ...gnot, source: 'default' }), managed({ id: 'foo' })]);
      service.setVisibility(account, GNO_NETWORK, 'ugnot', false);
      service.setVisibility(account, GNO_NETWORK, 'foo', false);
      expect(repository.get(account.id, GNO_NETWORK.id)?.map(token => token.visible)).toEqual([true, false]);
    });

    it('stores an empty list when nothing was stored yet', () => {
      const { service, repository } = setup();

      service.setVisibility(account, GNO_NETWORK, 'foo', false);
      expect(repository.get(account.id, GNO_NETWORK.id)).toEqual([]);
    });
  });

  describe('addCustomToken', () => {
    it('adds a registry token by trimmed id', async () => {
      const { service, repository, assets } = setup();

      assets.findToken.mockResolvedValue(makeToken({ id: 'foo' }));
      expect(await service.addCustomToken(account, GNO_NETWORK, '  foo ')).toMatchObject({ id: 'foo', source: 'custom', visible: true });
      expect(assets.findToken).toHaveBeenCalledWith('foo', GNO_NETWORK);
      expect(repository.get(account.id, GNO_NETWORK.id)).toHaveLength(1);
    });

    it('re-adding keeps the original source, shows it again and does not duplicate', async () => {
      const { service, repository, assets } = setup();

      repository.save(account.id, GNO_NETWORK.id, [managed({ id: 'foo', visible: false, source: 'discovered' })]);
      assets.findToken.mockResolvedValue(makeToken({ id: 'foo' }));
      expect(await service.addCustomToken(account, GNO_NETWORK, 'foo')).toMatchObject({ source: 'discovered', visible: true });
      expect(repository.get(account.id, GNO_NETWORK.id)).toHaveLength(1);
    });

    it('rejects ids missing from the registry', async () => {
      const { service } = setup();

      expect(isAppError(await catchError(() => service.addCustomToken(account, GNO_NETWORK, 'nope')), 'INVALID_REQUEST')).toBe(true);
    });
  });

  it('delegates registry search and balances to the network family assets', async () => {
    const { service, assets, cosmosAssets } = setup();
    const page = { tokens: [], total: 0 };
    const tokens = [makeToken()];

    assets.searchRegistry.mockResolvedValue(page);
    assets.getBalances.mockResolvedValue({ foo: '5' });
    await expect(service.searchRegistry(GNO_NETWORK, 10, 20)).resolves.toBe(page);
    expect(assets.searchRegistry).toHaveBeenCalledWith(GNO_NETWORK, 10, 20);
    await expect(service.getBalances(account, GNO_NETWORK, tokens)).resolves.toEqual({ foo: '5' });
    expect(assets.getBalances).toHaveBeenCalledWith(address, tokens, GNO_NETWORK);
    expect(cosmosAssets.getBalances).not.toHaveBeenCalled();
  });

  it('removes one account or every list', () => {
    const { service, repository } = setup();

    repository.save('a', GNO_NETWORK.id, [managed()]);
    repository.save('b', GNO_NETWORK.id, [managed()]);
    service.removeAccount('a');
    expect(repository.get('a', GNO_NETWORK.id)).toBeUndefined();
    expect(repository.get('b', GNO_NETWORK.id)).toHaveLength(1);
    service.clear();
    expect(repository.get('b', GNO_NETWORK.id)).toBeUndefined();
  });
});
