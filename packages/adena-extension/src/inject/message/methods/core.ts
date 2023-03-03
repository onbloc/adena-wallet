import { AdenaStorage } from "@common/storage";
import { ChainRepository, TokenRepository } from "@repositories/common";
import { WalletAccountRepository, WalletAddressRepository, WalletEstablishRepository, WalletRepository } from "@repositories/wallet";
import { ChainService, TokenService } from "@services/resource";
import { TransactionService } from "@services/transaction";
import { WalletAccountService, WalletAddressBookService, WalletEstablishService, WalletService } from "@services/wallet";
import axios from "axios";
import { GnoClient } from "gno-client";

export class InjectCore {

  public gnoClient: InstanceType<typeof GnoClient> | null = null;

  private axiosInstance = axios.create();

  private localStorage = AdenaStorage.local();

  private sessionStorage = AdenaStorage.session();

  private walletRepository = new WalletRepository(this.localStorage, this.sessionStorage);

  private accountRepository = new WalletAccountRepository(this.localStorage);

  private establishRepository = new WalletEstablishRepository(this.localStorage);

  private addressBookRepository = new WalletAddressRepository(this.localStorage);

  private chainRepository = new ChainRepository(this.localStorage, this.axiosInstance);

  private tokenRepository = new TokenRepository(this.axiosInstance);

  public chainService = new ChainService(this.chainRepository);

  public tokenService = new TokenService(this.tokenRepository);

  public walletService = new WalletService(this.walletRepository, this.accountRepository);

  public accountService = new WalletAccountService(this.gnoClient, this.accountRepository);

  public addressBookService = new WalletAddressBookService(this.accountRepository, this.addressBookRepository);

  public establishService = new WalletEstablishService(this.establishRepository, this.chainService);

  public transactionService = new TransactionService(this.gnoClient, this.chainService, this.walletService, this.accountService);

  public getGnoClient() {
    return this.chainService.getCurrentClient();
  }

}