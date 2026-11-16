import { StorageManager } from '@common/storage/storage-manager';
import { EstablishSite } from './wallet-establish';

type LocalValueType = 'ESTABLISH_ATOMONE_SITES';

export class WalletEstablishAtomOneRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getEstablishedSites = async (): Promise<{ [accountId: string]: EstablishSite[] }> => {
    const establishedSites = await this.localStorage.getToObject<{
      [accountId: string]: EstablishSite[];
    }>('ESTABLISH_ATOMONE_SITES');
    return establishedSites ?? {};
  };

  public updateEstablishedSites = async (addressBook: {
    [key in string]: EstablishSite[];
  }): Promise<void> => {
    await this.localStorage.setByObject('ESTABLISH_ATOMONE_SITES', addressBook);
  };

  public deleteEstablishedSites = async (): Promise<void> => {
    await this.localStorage.remove('ESTABLISH_ATOMONE_SITES');
  };
}
