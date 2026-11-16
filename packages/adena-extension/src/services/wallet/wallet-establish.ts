import { ChainRegistry } from 'adena-module';

import { EstablishSite, WalletEstablishRepository } from '@repositories/wallet';

export class WalletEstablishService {
  private walletEstablishRepository: WalletEstablishRepository;
  private chainRegistry: ChainRegistry;

  constructor(walletEstablishRepository: WalletEstablishRepository, chainRegistry: ChainRegistry) {
    this.walletEstablishRepository = walletEstablishRepository;
    this.chainRegistry = chainRegistry;
  }

  public getEstablishedSitesBy = async (accountId: string): Promise<EstablishSite[]> => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    return this.selectEstablishedSitesBy(accountId, establishedSites);
  };

  public isEstablishedBy = async (
    accountId: string,
    hostname: string,
    chainId?: string,
  ): Promise<boolean> => {
    const accountSites = await this.getEstablishedSitesBy(accountId);
    if (chainId === undefined) {
      // Legacy hostname-only check: any chainGroup connection counts. Used by
      // header status indicators and other UI gates that pre-date the
      // chainId-aware paths.
      return accountSites.some((site) => site.hostname === hostname);
    }
    const siblingChainIds = this.resolveSiblingChainIds(chainId);
    return accountSites.some(
      (site) => site.hostname === hostname && siblingChainIds.includes(site.chainId),
    );
  };

  public establishBy = async (
    accountId: string,
    chainId: string,
    establishedInfo: {
      hostname: string;
      accountId: string;
      appName: string;
      favicon?: string | null;
    },
  ): Promise<void> => {
    const siblingChainIds = this.resolveSiblingChainIds(chainId);
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountSites = this.selectEstablishedSitesBy(accountId, establishedSites);

    // Collapse any existing entry in the same (hostname, chainGroup) bucket so
    // a single approval covers the whole chainGroup. Mirrors
    // WalletEstablishAtomOneService.establishBy.
    const retained = accountSites.filter(
      (site) =>
        !(site.hostname === establishedInfo.hostname && siblingChainIds.includes(site.chainId)),
    );

    const updated: { [key in string]: EstablishSite[] } = {
      ...establishedSites,
      [accountId]: [
        ...retained,
        {
          hostname: establishedInfo.hostname,
          chainId,
          account: establishedInfo.accountId,
          name: establishedInfo.appName,
          favicon: establishedInfo.favicon ?? null,
          establishedTime: `${new Date().getTime()}`,
        },
      ],
    };

    await this.walletEstablishRepository.updateEstablishedSites(updated);
  };

  public unEstablishBy = async (
    accountId: string,
    hostname: string,
    chainId?: string,
  ): Promise<void> => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountSites = this.selectEstablishedSitesBy(accountId, establishedSites);

    const retained = accountSites.filter((site) => {
      if (chainId === undefined) {
        // Legacy: revoke every entry for the hostname.
        return site.hostname !== hostname;
      }
      const siblingChainIds = this.resolveSiblingChainIds(chainId);
      return !(site.hostname === hostname && siblingChainIds.includes(site.chainId));
    });

    const updated = {
      ...establishedSites,
      [accountId]: retained,
    };

    await this.walletEstablishRepository.updateEstablishedSites(updated);
  };

  public clear = async (): Promise<boolean> => {
    await this.walletEstablishRepository.deleteEstablishedSites();
    return true;
  };

  private resolveSiblingChainIds = (chainId: string): string[] => {
    const chain = this.chainRegistry.getChainByChainId(chainId);
    if (!chain) {
      throw new Error(`Unknown chainId: ${chainId}`);
    }
    return this.chainRegistry
      .listNetworkProfilesByChain(chain.chainGroup)
      .map((profile) => profile.chainId);
  };

  private selectEstablishedSitesBy = (
    accountId: string,
    establishedSites: { [key in string]: EstablishSite[] },
  ): EstablishSite[] => {
    return establishedSites[accountId] ?? [];
  };
}
