import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { ManagedToken, Token, TokenSource } from '../domain/token';
import { RegistryPage } from '../repositories/chain/asset-repository';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { TokenListRepository } from '../repositories/token-list.repository';
import { getDefaultTokensFor } from '../resources';
import { AccountService } from './account.service';

const toManaged = (token: Token, source: ManagedToken['source'], visible = true): ManagedToken => ({ ...token, source, visible });

// Keeps the per-account token list in sync with resources, discovery and user choices.
export class TokenService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly tokenListRepository: TokenListRepository,
  ) {}

  async getTokenList(account: Account, network: Network): Promise<ManagedToken[]> {
    const assets = this.chainRegistry.assets(network);
    const address = this.accountService.getAddress(account, network);
    const [curated, discovered] = await Promise.all([
      assets.getCuratedTokens(network).catch(() => [] as Token[]),
      assets.discoverHeldTokens(address, network).catch(() => [] as Token[]),
    ]);
    // Read after the network calls so visibility or custom-token changes made meanwhile are kept.
    const stored = this.tokenListRepository.get(account.id, network.id) ?? [];

    const byId = new Map<string, ManagedToken>();

    // Network coins (GNOT; ATONE + PHOTON) are always listed first and cannot be hidden.
    getDefaultTokensFor(network).forEach((token) => {
      byId.set(token.id, toManaged({ ...token, ...curated.find(item => item.id === token.id) }, 'default'));
    });
    stored.filter(token => !token.isNative).forEach(token => byId.set(token.id, token));
    discovered.forEach((token) => {
      if (!byId.has(token.id)) {
        byId.set(token.id, toManaged(token, TokenSource.DISCOVERED));
      }
    });
    // Refresh metadata from the latest resources without touching user choices.
    const merged = [...byId.values()].map((token) => {
      const fresh = curated.find(item => item.id === token.id);

      if (fresh) {
        return { ...token, ...fresh, visible: token.isNative || token.visible, source: token.source, listed: true };
      }

      const { listed: _listed, ...rest } = token;

      return rest;
    });

    // A refresh that outlived the account (removal, reset) must not write its list back.
    if (this.accountService.getAccounts().some(item => item.id === account.id)) {
      this.tokenListRepository.save(account.id, network.id, merged);
    }

    return merged;
  }

  // Network coins plus the last saved list, without any network call (e.g. for local search).
  getCachedTokenList(account: Account, network: Network): ManagedToken[] {
    const coins = getDefaultTokensFor(network).map(token => toManaged(token, TokenSource.DEFAULT));
    const stored = (this.tokenListRepository.get(account.id, network.id) ?? []).filter(token => !coins.some(coin => coin.id === token.id));

    return [...coins, ...stored];
  }

  getStoredToken(account: Account, network: Network, tokenId: string): ManagedToken | undefined {
    const coin = getDefaultTokensFor(network).find(token => token.id === tokenId);

    if (coin) {
      return toManaged(coin, TokenSource.DEFAULT);
    }

    return this.tokenListRepository.get(account.id, network.id)?.find(token => token.id === tokenId);
  }

  setVisibility(account: Account, network: Network, tokenId: string, visible: boolean): void {
    const list = this.tokenListRepository.get(account.id, network.id) ?? [];

    this.tokenListRepository.save(account.id, network.id, list.map(token =>
      token.id === tokenId && !token.isNative ? { ...token, visible } : token));
  }

  async addCustomToken(account: Account, network: Network, tokenId: string): Promise<ManagedToken> {
    const token = await this.chainRegistry.assets(network).findToken(tokenId.trim(), network);

    if (!token) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Token not found in the registry');
    }

    const list = this.tokenListRepository.get(account.id, network.id) ?? [];
    const existing = list.find(item => item.id === token.id);
    const managed = toManaged(token, existing?.source ?? TokenSource.CUSTOM);

    this.tokenListRepository.save(account.id, network.id, [...list.filter(item => item.id !== token.id), managed]);
    return managed;
  }

  searchRegistry(network: Network, offset: number, limit: number): Promise<RegistryPage> {
    return this.chainRegistry.assets(network).searchRegistry(network, offset, limit);
  }

  getBalances(account: Account, network: Network, tokens: Token[]): Promise<Record<string, string>> {
    const address = this.accountService.getAddress(account, network);

    return this.chainRegistry.assets(network).getBalances(address, tokens, network);
  }

  removeAccount(accountId: string): void {
    this.tokenListRepository.removeAccount(accountId);
  }

  clear(): void {
    this.tokenListRepository.clear();
  }
}
