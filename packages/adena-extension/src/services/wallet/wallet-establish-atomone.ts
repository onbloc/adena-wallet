import { ChainRegistry } from 'adena-module';
import { EstablishSite } from '@repositories/wallet';
import { WalletEstablishAtomOneRepository } from '@repositories/wallet/wallet-establish-atomone';

export class WalletEstablishAtomOneService {
  private repository: WalletEstablishAtomOneRepository;
  private chainRegistry: ChainRegistry;

  constructor(repository: WalletEstablishAtomOneRepository, chainRegistry: ChainRegistry) {
    this.repository = repository;
    this.chainRegistry = chainRegistry;
  }

  public getEstablishedSitesBy = async (accountId: string): Promise<EstablishSite[]> => {
    const establishedSites = await this.repository.getEstablishedSites();
    return this.selectEstablishedSitesBy(accountId, establishedSites);
  };

  public isEstablishedBy = async (
    accountId: string,
    hostname: string,
    chainId: string,
  ): Promise<boolean> => {
    const siblingChainIds = this.resolveSiblingChainIds(chainId);
    const accountSites = await this.getEstablishedSitesBy(accountId);
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
    const establishedSites = await this.repository.getEstablishedSites();
    const accountSites = this.selectEstablishedSitesBy(accountId, establishedSites);

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

    await this.repository.updateEstablishedSites(updated);
  };

  public unEstablishBy = async (
    accountId: string,
    hostname: string,
    chainId: string,
  ): Promise<void> => {
    const siblingChainIds = this.resolveSiblingChainIds(chainId);
    const establishedSites = await this.repository.getEstablishedSites();
    const accountSites = this.selectEstablishedSitesBy(accountId, establishedSites);

    const retained = accountSites.filter(
      (site) => !(site.hostname === hostname && siblingChainIds.includes(site.chainId)),
    );

    const updated = {
      ...establishedSites,
      [accountId]: retained,
    };

    await this.repository.updateEstablishedSites(updated);
  };

  public clear = async (): Promise<boolean> => {
    await this.repository.deleteEstablishedSites();
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
