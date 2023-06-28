import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletAccountRepository } from '@repositories/wallet';
import { Account } from 'adena-module';

export class WalletAccountService {
  private walletAccountRepository: WalletAccountRepository;

  private gnoProvider: GnoProvider | null;

  constructor(walletAccountRepository: WalletAccountRepository) {
    this.walletAccountRepository = walletAccountRepository;
    this.gnoProvider = null;
  }

  public getGnoProvider() {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  public setGnoProvider(gnoProvider: GnoProvider) {
    this.gnoProvider = gnoProvider;
  }

  public getAccountInfo = async (address: string) => {
    const gnoProvider = this.getGnoProvider();
    const account = await gnoProvider.getAccount(address);
    if (!account) {
      return null;
    }
    return account;
  };

  public getCurrentAccountId = async () => {
    return this.walletAccountRepository.getCurrentAccountId();
  };

  public changeCurrentAccount = async (account: Account) => {
    await this.walletAccountRepository.updateCurrentAccountId(account.id);
    return true;
  };

  public getAccountNames = async () => {
    return this.walletAccountRepository.getAccountNames();
  };

  public updateAccountNames = async (accountNames: { [key in string]: string }) => {
    return this.walletAccountRepository.updateAccountNames(accountNames);
  };

  public deleteAccountNames = async () => {
    return this.walletAccountRepository.deleteAccountNames();
  };

  public clear = async () => {
    await this.walletAccountRepository.deleteCurrentAccountId();
    return true;
  };
}
