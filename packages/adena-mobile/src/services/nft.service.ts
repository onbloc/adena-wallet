import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { NftCollection, NftItem, NftMetadata, Page } from '../domain/nft';
import { TransactionDraft } from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { NftPreferenceRepository, NftPreferences } from '../repositories/nft-preference.repository';
import { AccountService } from './account.service';

export class NftService {
  // Token URIs are immutable per chain, so found ones are cached for the session.
  private readonly uriCache = new Map<string, Promise<string | null>>();

  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly preferenceRepository: NftPreferenceRepository,
  ) {}

  isSupported(network: Network): boolean {
    return Boolean(network.apiUrl);
  }

  getCollections(account: Account, network: Network): Promise<NftCollection[]> {
    return this.chainRegistry.nfts(network).getCollections(this.accountService.getAddress(account, network), network);
  }

  getItems(account: Account, network: Network, collection: NftCollection, cursor?: string | null): Promise<Page<NftItem>> {
    return this.chainRegistry.nfts(network).getItems(this.accountService.getAddress(account, network), collection, network, cursor);
  }

  getTokenUri(network: Network, packagePath: string, nftId: string): Promise<string | null> {
    const key = `${network.chainId}:${packagePath}:${nftId}`;
    let cached = this.uriCache.get(key);

    if (!cached) {
      cached = this.chainRegistry.nfts(network).getTokenUri(packagePath, nftId, network);
      // The repository reports RPC failures as null, so a miss is retried next time.
      cached.then(uri => uri === null && this.uriCache.delete(key), () => this.uriCache.delete(key));
      this.uriCache.set(key, cached);
    }

    return cached;
  }

  getMetadata(network: Network, packagePath: string, nftId: string): Promise<NftMetadata | null> {
    return this.chainRegistry.nfts(network).getMetadata(packagePath, nftId, network);
  }

  getPreferences(account: Account, network: Network): NftPreferences {
    return this.preferenceRepository.get(account.id, network.id);
  }

  setHidden(account: Account, network: Network, packagePath: string, hidden: boolean): NftPreferences {
    const current = this.getPreferences(account, network);
    const next = {
      ...current,
      hidden: hidden ? [...new Set([...current.hidden, packagePath])] : current.hidden.filter(item => item !== packagePath),
    };

    this.preferenceRepository.save(account.id, network.id, next);
    return next;
  }

  setPinned(account: Account, network: Network, packagePath: string, pinned: boolean): NftPreferences {
    const current = this.getPreferences(account, network);
    const next = {
      ...current,
      pinned: pinned ? [packagePath, ...current.pinned.filter(item => item !== packagePath)] : current.pinned.filter(item => item !== packagePath),
    };

    this.preferenceRepository.save(account.id, network.id, next);
    return next;
  }

  // Visible collections with pinned ones first, in pin order.
  static arrange(collections: NftCollection[], preferences: NftPreferences): NftCollection[] {
    const visible = collections.filter(collection => !preferences.hidden.includes(collection.packagePath));
    const pinRank = (collection: NftCollection): number => {
      const index = preferences.pinned.indexOf(collection.packagePath);

      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };

    return [...visible].sort((a, b) => pinRank(a) - pinRank(b) || a.name.localeCompare(b.name));
  }

  createTransferDraft(account: Account, network: Network, item: NftItem, toAddress: string, memo = ''): TransactionDraft {
    const fromAddress = this.accountService.getAddress(account, network);

    return {
      networkId: network.id,
      chainId: network.chainId,
      messages: this.chainRegistry.nfts(network).buildTransferMessages({
        network,
        fromAddress,
        toAddress,
        packagePath: item.packagePath,
        nftId: item.nftId,
      }),
      fee: { gasWanted: '0', gasFee: '' },
      memo,
    };
  }

  removeAccount(accountId: string): void {
    this.preferenceRepository.removeAccount(accountId);
  }
}
