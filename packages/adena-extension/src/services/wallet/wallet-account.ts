import { AccountInfo, GnoProvider } from '@common/provider/gno';
import { WalletAccountRepository } from '@repositories/wallet';
import { Account } from 'adena-module';

const defaultAccountInfo: AccountInfo = {
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

  constructor(walletAccountRepository: WalletAccountRepository, gnoProvider: GnoProvider | null) {
    this.walletAccountRepository = walletAccountRepository;
    this.gnoProvider = gnoProvider;
  }

  public getGnoProvider(): GnoProvider {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  public setGnoProvider(gnoProvider: GnoProvider): void {
    this.gnoProvider = gnoProvider;
  }

  public getAccountInfo = async (address: string): Promise<AccountInfo> => {
    const gnoProvider = this.getGnoProvider();
    return this.getAccountInfoByProvider(address, gnoProvider);
  };

  public getAccountInfoByNetwork = async (
    address: string,
    rpcUrl: string,
    chainId: string,
  ): Promise<AccountInfo> => {
    const gnoProvider = new GnoProvider(rpcUrl, chainId);
    return this.getAccountInfoByProvider(address, gnoProvider);
  };

  public getAccountInfoByProvider = async (
    address: string,
    gnoProvider: GnoProvider,
  ): Promise<AccountInfo> => {
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

  public getCurrentAccountId = async (): Promise<string> => {
    return this.walletAccountRepository.getCurrentAccountId();
  };

  public changeCurrentAccount = async (account: Account): Promise<boolean> => {
    await this.walletAccountRepository.updateCurrentAccountId(account.id);
    return true;
  };

  public getAccountNames = async (): Promise<{
    [x: string]: string;
  }> => {
    return this.walletAccountRepository.getAccountNames();
  };

  public updateAccountNames = async (accountNames: {
    [key in string]: string;
  }): Promise<boolean> => {
    return this.walletAccountRepository.updateAccountNames(accountNames);
  };

  public deleteAccountNames = async (): Promise<boolean> => {
    return this.walletAccountRepository.deleteAccountNames();
  };

  public clear = async (): Promise<boolean> => {
    await this.walletAccountRepository.deleteCurrentAccountId();
    return true;
  };
}
