import { StorageManager } from "@common/storage/storage-manager";

type LocalValueType = 'ESTABLISH_SITES';

export class WalletEstablishRepository {

  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getEstablishedSites = async () => {
    const establishedSites = await this.localStorage.getToObject('ESTABLISH_SITES');
    return establishedSites;
  };

  public updateEstablishedSites = async (addressBook: { [key in string]: any }) => {
    await this.localStorage.setByObject('ESTABLISH_SITES', addressBook);
  };

  public deleteEstablishedSites = async () => {
    await this.localStorage.remove('ESTABLISH_SITES');
  };
}