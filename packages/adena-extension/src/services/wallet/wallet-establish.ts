import { WalletEstablishRepository } from '@repositories/wallet';
import { ChainService } from '..';

interface EstablishSite {
  hostname: string;
  chainId: string;
  account: string;
  name: string;
  favicon: string | null;
  establishedTime: string;
}

export class WalletEstablishService {

  private walletEstablishRepository: WalletEstablishRepository;

  private chainService: ChainService;

  constructor(
    walletEstablishRepository: WalletEstablishRepository,
    chainService: ChainService
  ) {
    this.walletEstablishRepository = walletEstablishRepository;
    this.chainService = chainService;
  }

  public getCurrentEstablisedSites = async (address: string) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.getAccountEstablishedSites(
      establishedSites,
      address,
    );
    return accountEstablishedSites;
  };

  public isEstablished = async (hostname: string, address: string) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.getAccountEstablishedSites(
      establishedSites,
      address,
    );
    return accountEstablishedSites.findIndex((site: EstablishSite) => site.hostname === hostname) > -1;
  };

  public establish = async (hostname: string, address: string, appName: string, favicon?: string | null) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const currentChain = await this.chainService.getCurrentNetwork();
    const currentChainId = currentChain.chainId;
    const accountEstablishedSites = await this.getAccountEstablishedSites(
      establishedSites,
      address,
    );
    const changedEstablishedSites: { [key in string]: Array<EstablishSite> } = {
      ...establishedSites,
      [address]: [
        ...accountEstablishedSites.filter((site: EstablishSite) => site.hostname !== hostname),
        {
          hostname,
          chainId: currentChainId !== '' ? currentChainId : 'test3',
          account: address,
          name: appName,
          favicon: favicon ?? null,
          establishedTime: `${new Date().getTime()}`,
        },
      ],
    };
    await this.walletEstablishRepository.updateEstablishedSites(changedEstablishedSites);
  };

  public unestablish = async (hostname: string, address: string) => {
    const establishedSites = await this.walletEstablishRepository.getEstablishedSites();
    const accountEstablishedSites = await this.getAccountEstablishedSites(
      establishedSites,
      address,
    );

    const changedAccountEstablishedSites = accountEstablishedSites.filter(
      (site: EstablishSite) => site.hostname !== hostname,
    );

    // eslint-disable-next-line prefer-const
    let changedEstablishedSites = {
      ...establishedSites,
      [address]: changedAccountEstablishedSites,
    };
    await this.walletEstablishRepository.updateEstablishedSites(changedEstablishedSites);
  };

  private getAccountEstablishedSites = async (
    establishedSites: { [key in string]: Array<EstablishSite> },
    address: string,
  ) => {
    const currentChain = await this.chainService.getCurrentNetwork();
    const currentChainId = currentChain.chainId;
    const accountEstablishedSites =
      Object.keys(establishedSites).findIndex((key) => key === address) > -1
        ? [...establishedSites[address]].filter(
          (site) => site.chainId === currentChainId,
        )
        : [];
    return accountEstablishedSites;
  };
}

