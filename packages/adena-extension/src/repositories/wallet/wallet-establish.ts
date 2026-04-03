import { StorageManager } from '@common/storage/storage-manager';

type LocalValueType = 'ESTABLISH_SITES';

export interface EstablishSite {
  hostname: string;
  chainId: string;
  account: string;
  name: string;
  favicon: string | null;
  establishedTime: string;
}

export class WalletEstablishRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getEstablishedSites = async (): Promise<{ [x: string]: any }> => {
    const establishedSites = await this.localStorage.getToObject('ESTABLISH_SITES');
    return establishedSites;
  };

  public updateEstablishedSites = async (addressBook: {
    [key in string]: EstablishSite[];
  }): Promise<void> => {
    await this.localStorage.setByObject('ESTABLISH_SITES', addressBook);
  };

  public deleteEstablishedSites = async (): Promise<void> => {
    await this.localStorage.remove('ESTABLISH_SITES');
  };
}
