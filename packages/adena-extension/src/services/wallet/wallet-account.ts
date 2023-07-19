import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletAccountRepository } from '@repositories/wallet';
import { Account } from 'adena-module';

const defaultAccountInfo = {
  address: '',
  coins: '0ugnot',
  chainId: '',
  status: 'IN_ACTIVE',
  publicKey: {
    '@type': '',
    value: '',
  },
  accountNumber: '',
  sequence: '',
};

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
    return this.getAccountInfoByProvider(address, gnoProvider);
  };

  public getAccountInfoByNetwork = async (address: string, rpcUrl: string, chainId: string) => {
    const gnoProvider = new GnoProvider(rpcUrl, chainId);
    return this.getAccountInfoByProvider(address, gnoProvider);
  };

  public getAccountInfoByProvider = async (address: string, gnoProvider: GnoProvider) => {
    try {
      const account = await gnoProvider.getAccount(address);
      if (account) {
        return account;
      }
    } catch (e) {
      console.log(e);
    }
    return {
      ...defaultAccountInfo,
      address,
    };
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
