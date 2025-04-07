import { Account } from 'adena-module';
import axios from 'axios';

import { GnoProvider } from '@common/provider/gno/gno-provider';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
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
import { NetworkMetainfo } from '@types';
import { decryptPassword, getInMemoryKey } from '../commands/encrypt';

export class InjectCore {
  private inMemoryProvider: MemoryProvider;

  private gnoProvider: GnoProvider | null = null;

  private axiosInstance = axios.create({});

  private localStorage = AdenaStorage.local();

  private sessionStorage = AdenaStorage.session();

  private walletRepository = new WalletRepository(this.localStorage, this.sessionStorage);

  private accountRepository = new WalletAccountRepository(this.localStorage);

  private establishRepository = new WalletEstablishRepository(this.localStorage);

  private addressBookRepository = new WalletAddressRepository(this.localStorage);

  private chainRepository = new ChainRepository(this.localStorage, this.axiosInstance);

  private tokenRepository = new TokenRepository(
    this.localStorage,
    this.axiosInstance,
    null,
    this.gnoProvider,
  );

  public chainService = new ChainService(this.chainRepository);

  public tokenService = new TokenService(this.tokenRepository);

  public walletService = new WalletService(this.walletRepository);

  public accountService = new WalletAccountService(this.accountRepository, this.gnoProvider);

  public addressBookService = new WalletAddressBookService(
    this.walletRepository,
    this.addressBookRepository,
  );

  public establishService = new WalletEstablishService(this.establishRepository);

  public transactionService = new TransactionService(this.walletService, this.gnoProvider);

  constructor(inMemoryProvider: MemoryProvider) {
    this.inMemoryProvider = inMemoryProvider;
  }

  public async getInMemoryKey(): Promise<CryptoKey | null> {
    return getInMemoryKey(this.inMemoryProvider);
  }

  public async initGnoProvider(): Promise<boolean> {
    try {
      const network = await this.chainService.getCurrentNetwork();
      this.tokenService.setNetworkMetainfo(network);
      this.gnoProvider = new GnoProvider(network.rpcUrl, network.networkId);
      this.accountService.setGnoProvider(this.gnoProvider);
      this.transactionService.setGnoProvider(this.gnoProvider);
    } catch (e) {
      console.error(e);
      return false;
    }
    return true;
  }

  public getCurrentAccountId(): Promise<string> {
    return this.accountRepository.getCurrentAccountId().catch(() => '');
  }

  public async getCurrentNetwork(): Promise<NetworkMetainfo | null> {
    const networks = await this.chainRepository.getNetworks();
    if (networks.length === 0) {
      return null;
    }
    const networkId = await this.chainRepository.getCurrentNetworkId().catch(() => '');
    const network = networks.find((network) => network.id === networkId) || networks[0];
    return network;
  }

  public getCurrentNetworkId(): Promise<string> {
    return this.chainRepository.getCurrentNetworkId().catch(() => '');
  }

  public async getCurrentAccount(inMemoryKey: CryptoKey | null): Promise<Account | undefined> {
    const password = await this.getPasswordBy(inMemoryKey);
    if (!password) {
      return undefined;
    }

    const wallet = await this.walletService.deserializeWallet(password);

    const accountId = await this.accountService.getCurrentAccountId();
    const currentAccount = wallet.accounts.find((account) => account.id === accountId);
    return currentAccount;
  }

  public async getCurrentAddress(inMemoryKey: CryptoKey | null): Promise<string | null> {
    const currentAccount = await this.getCurrentAccount(inMemoryKey);
    if (!currentAccount) {
      return null;
    }
    return currentAccount.getAddress('g');
  }

  public async isLockedBy(inMemoryKey: CryptoKey | null): Promise<boolean> {
    return this.getPasswordBy(inMemoryKey)
      .then((password) => !password)
      .catch(() => true);
  }

  private async getPasswordBy(inMemoryKey: CryptoKey | null): Promise<string | null> {
    if (!inMemoryKey) {
      return null;
    }

    const { iv, encryptedPassword } = await this.walletRepository.getSessionCryptPasswords();
    if (iv === '' || encryptedPassword === '') {
      return null;
    }

    return decryptPassword(inMemoryKey, iv, encryptedPassword);
  }
}
