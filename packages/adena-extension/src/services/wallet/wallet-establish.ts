import { EstablishSite, WalletEstablishRepository } from '@repositories/wallet';

export class WalletEstablishService {
  private walletEstablishRepository: WalletEstablishRepository;

  constructor(walletEstablishRepository: WalletEstablishRepository) {
    this.walletEstablishRepository = walletEstablishRepository;
  }

  public getEstablisedSitesBy = async (accountId: string) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.selectEstablishedSitesBy(
      accountId,
      establishedSites,
    );
    return accountEstablishedSites;
  };

  public isEstablishedBy = async (accountId: string, hostname: string) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.selectEstablishedSitesBy(
      accountId,
      establishedSites,
    );
    return (
      accountEstablishedSites.findIndex((site: EstablishSite) => site.hostname === hostname) > -1
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
  ) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.selectEstablishedSitesBy(
      accountId,
      establishedSites,
    );
    const changedEstablishedSites: { [key in string]: Array<EstablishSite> } = {
      ...establishedSites,
      [accountId]: [
        ...accountEstablishedSites.filter(
          (site: EstablishSite) => site.hostname !== establishedInfo.hostname,
        ),
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
    await this.walletEstablishRepository.updateEstablishedSites(changedEstablishedSites);
  };

  public unestablishBy = async (accountId: string, hostname: string) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.selectEstablishedSitesBy(
      accountId,
      establishedSites,
    );

    const changedAccountEstablishedSites = accountEstablishedSites.filter(
      (site: EstablishSite) => site.hostname !== hostname,
    );

    // eslint-disable-next-line prefer-const
    let changedEstablishedSites = {
      ...establishedSites,
      [accountId]: changedAccountEstablishedSites,
    };
    await this.walletEstablishRepository.updateEstablishedSites(changedEstablishedSites);
  };

  public clear = async () => {
    await this.walletEstablishRepository.deleteEstablishedSites();
    return true;
  };

  private selectEstablishedSitesBy = async (
    accountId: string,
    establishedSites: { [key in string]: Array<EstablishSite> },
  ) => {
    const accountEstablishedSites =
      Object.keys(establishedSites).findIndex((key) => key === accountId) > -1
        ? establishedSites[accountId]
        : [];
    return accountEstablishedSites;
  };
}
