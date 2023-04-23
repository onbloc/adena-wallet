import { WalletAccountRepository } from '@repositories/wallet';
import { Account } from 'adena-module';

export class WalletAccountService {
  private walletAccountRepository: WalletAccountRepository;

  constructor(walletAccountRepository: WalletAccountRepository) {
    this.walletAccountRepository = walletAccountRepository;
  }

  public getCurrentAccountId = async () => {
    return this.walletAccountRepository.getCurrentAccountId();
  };

  public changeCurrentAccount = async (account: Account) => {
    await this.walletAccountRepository.updateCurrentAccountId(account.id);
    return true;
  };

  public clear = async () => {
    await this.walletAccountRepository.deleteCurrentAccountId();
    return true;
  };
}
