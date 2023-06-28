import { GnoProvider } from '@common/provider/gno/gno-provider';
import { AdenaStorage } from '@common/storage';
import { ChainRepository, TokenRepository } from '@repositories/common';
import {
  WalletAccountRepository,
  WalletAddressRepository,
  WalletEstablishRepository,
  WalletRepository,
} from '@repositories/wallet';
import { ChainService, TokenService } from '@services/resource';
import { TransactionService } from '@services/transaction';
import {
  WalletAccountService,
  WalletAddressBookService,
  WalletEstablishService,
  WalletService,
} from '@services/wallet';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import axios from 'axios';

export class InjectCore {
  private gnoProvider: GnoProvider | null = null;

  private axiosInstance = axios.create({ adapter: fetchAdapter });

  private localStorage = AdenaStorage.local();

  private sessionStorage = AdenaStorage.session();

  private walletRepository = new WalletRepository(this.localStorage, this.sessionStorage);

  private accountRepository = new WalletAccountRepository(this.localStorage);

  private establishRepository = new WalletEstablishRepository(this.localStorage);

  private addressBookRepository = new WalletAddressRepository(this.localStorage);

  private chainRepository = new ChainRepository(this.localStorage, this.axiosInstance);

  private tokenRepository = new TokenRepository(this.localStorage, this.axiosInstance);

  public chainService = new ChainService(this.chainRepository);

  public tokenService = new TokenService(this.tokenRepository);

  public walletService = new WalletService(this.walletRepository);

  public accountService = new WalletAccountService(this.accountRepository);

  public addressBookService = new WalletAddressBookService(this.addressBookRepository);

  public establishService = new WalletEstablishService(this.establishRepository);

  public transactionService = new TransactionService(this.walletService);

  public async initGnoProvider() {
    try {
      const network = await this.chainService.getCurrentNetwork();
      this.gnoProvider = new GnoProvider(network.rpcUrl, network.networkId);
      this.accountService.setGnoProvider(this.gnoProvider);
      this.transactionService.setGnoProvider(this.gnoProvider);
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  public getCurrentAccountId() {
    return this.accountRepository.getCurrentAccountId().catch(() => '');
  }

  public getCurrentNetworkId() {
    return this.chainRepository.getCurrentNetworkId().catch(() => '');
  }

  public async getCurrentAccount() {
    const wallet = await this.walletService.loadWallet();
    const accountId = await this.accountService.getCurrentAccountId();
    const currentAccount = wallet.accounts.find((account) => account.id === accountId);
    return currentAccount;
  }

  public async getCurrentAddress() {
    const currentAccount = await this.getCurrentAccount();
    if (!currentAccount) {
      return null;
    }
    return currentAccount.getAddress('g');
  }
}
