import { fromBase64 } from '@cosmjs/encoding';

import { NftCollection, NftItem } from '../../../src/domain/nft';
import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { StorageNftPreferenceRepository } from '../../../src/repositories/nft-preference.repository';
import { AccountService } from '../../../src/services/account.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { NftService } from '../../../src/services/nft.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { createFakeRegistry, fakeAddress, GNO_NETWORK, makeAccount, networkById } from '../../helpers/service-fakes';

const collection = (packagePath: string, name = packagePath): NftCollection => ({
  id: packagePath, packagePath, name, symbol: 'NFT', ownedCount: 1, supportsTokenUri: true, supportsMetadata: true,
});

const setup = () => {
  const { registry, modules } = createFakeRegistry();
  const accountService = new AccountService(new StorageAccountRepository(new MemoryKeyValueStore()), new KeyringSession(), registry);
  const preferences = new StorageNftPreferenceRepository(new MemoryKeyValueStore());

  return { service: new NftService(registry, accountService, preferences), nfts: modules.gno.nfts };
};

describe('NftService', () => {
  const account = makeAccount();
  const address = fakeAddress(fromBase64(account.publicKey), GNO_NETWORK);

  it('is supported only on networks with a data API', () => {
    const { service } = setup();

    expect(service.isSupported(GNO_NETWORK)).toBe(true);
    expect(service.isSupported(networkById('gnoswap'))).toBe(false);
  });

  it('loads collections and items for the account address', async () => {
    const { service, nfts } = setup();
    const page = { items: [], cursor: null, hasNext: false };

    nfts.getCollections.mockResolvedValue([collection('a')]);
    nfts.getItems.mockResolvedValue(page);
    await expect(service.getCollections(account, GNO_NETWORK)).resolves.toEqual([collection('a')]);
    expect(nfts.getCollections).toHaveBeenCalledWith(address, GNO_NETWORK);
    await expect(service.getItems(account, GNO_NETWORK, collection('a'), 'next')).resolves.toBe(page);
    expect(nfts.getItems).toHaveBeenCalledWith(address, collection('a'), GNO_NETWORK, 'next');
  });

  it('caches token URIs per chain, package and id', async () => {
    const { service, nfts } = setup();

    nfts.getTokenUri.mockResolvedValue('https://img/1');
    await expect(service.getTokenUri(GNO_NETWORK, 'pkg', '1')).resolves.toBe('https://img/1');
    await expect(service.getTokenUri(GNO_NETWORK, 'pkg', '1')).resolves.toBe('https://img/1');
    expect(nfts.getTokenUri).toHaveBeenCalledTimes(1);
    await service.getTokenUri(GNO_NETWORK, 'pkg', '2');
    await service.getTokenUri(networkById('onyx-1'), 'pkg', '1');
    expect(nfts.getTokenUri).toHaveBeenCalledTimes(3);
  });

  it('does not cache failed token URI lookups', async () => {
    const { service, nfts } = setup();

    nfts.getTokenUri.mockRejectedValueOnce(new Error('rpc down')).mockResolvedValueOnce(null);
    await expect(service.getTokenUri(GNO_NETWORK, 'pkg', '1')).rejects.toThrow('rpc down');
    await expect(service.getTokenUri(GNO_NETWORK, 'pkg', '1')).resolves.toBeNull();
    expect(nfts.getTokenUri).toHaveBeenCalledTimes(2);
  });

  it('loads metadata through the chain', async () => {
    const { service, nfts } = setup();
    const metadata = { name: 'One', attributes: [] };

    nfts.getMetadata.mockResolvedValue(metadata);
    await expect(service.getMetadata(GNO_NETWORK, 'pkg', '1')).resolves.toBe(metadata);
    expect(nfts.getMetadata).toHaveBeenCalledWith('pkg', '1', GNO_NETWORK);
  });

  describe('preferences', () => {
    it('start empty', () => {
      expect(setup().service.getPreferences(account, GNO_NETWORK)).toEqual({ hidden: [], pinned: [] });
    });

    it('hide and unhide collections without duplicates', () => {
      const { service } = setup();

      service.setHidden(account, GNO_NETWORK, 'a', true);
      expect(service.setHidden(account, GNO_NETWORK, 'a', true).hidden).toEqual(['a']);
      service.setHidden(account, GNO_NETWORK, 'b', true);
      expect(service.setHidden(account, GNO_NETWORK, 'a', false)).toEqual({ hidden: ['b'], pinned: [] });
      expect(service.getPreferences(account, GNO_NETWORK).hidden).toEqual(['b']);
    });

    it('pin to the front and unpin', () => {
      const { service } = setup();

      service.setPinned(account, GNO_NETWORK, 'a', true);
      service.setPinned(account, GNO_NETWORK, 'b', true);
      expect(service.setPinned(account, GNO_NETWORK, 'a', true).pinned).toEqual(['a', 'b']);
      expect(service.setPinned(account, GNO_NETWORK, 'b', false).pinned).toEqual(['a']);
    });

    it('are scoped per account and network and removed with the account', () => {
      const { service } = setup();
      const other = makeAccount({ id: 'other' });

      service.setHidden(account, GNO_NETWORK, 'a', true);
      service.setHidden(other, GNO_NETWORK, 'b', true);
      expect(service.getPreferences(account, networkById('onyx-1')).hidden).toEqual([]);
      service.removeAccount(account.id);
      expect(service.getPreferences(account, GNO_NETWORK).hidden).toEqual([]);
      expect(service.getPreferences(other, GNO_NETWORK).hidden).toEqual(['b']);
    });
  });

  it('arranges visible collections with pinned ones first in pin order, then by name', () => {
    const arranged = NftService.arrange(
      [collection('d', 'Delta'), collection('c', 'Charlie'), collection('b', 'Bravo'), collection('a', 'Alpha'), collection('h', 'Hidden')],
      { hidden: ['h'], pinned: ['c', 'd', 'gone'] },
    );

    expect(arranged.map(item => item.packagePath)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('builds an unpriced transfer draft from the chain messages', () => {
    const { service, nfts } = setup();
    const item: NftItem = { collectionId: 'pkg', packagePath: 'pkg', nftId: '7', name: 'Seven', symbol: 'NFT' };

    expect(service.createTransferDraft(account, GNO_NETWORK, item, 'g1to')).toEqual({
      networkId: GNO_NETWORK.id,
      chainId: GNO_NETWORK.chainId,
      messages: [{ type: 'nft-transfer' }],
      fee: { gasWanted: '0', gasFee: '' },
      memo: '',
    });
    expect(nfts.buildTransferMessages).toHaveBeenCalledWith({ network: GNO_NETWORK, fromAddress: address, toAddress: 'g1to', packagePath: 'pkg', nftId: '7' });
    expect(service.createTransferDraft(account, GNO_NETWORK, item, 'g1to', 'hi').memo).toBe('hi');
  });
});
