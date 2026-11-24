import { FEATURES } from '../config/features';
import { FetchHttpClient, HttpClient } from '../infrastructure/http/http-client';
import { OnblocApiClient } from '../infrastructure/http/onbloc-api.client';
import { StorageAccountRepository } from '../repositories/account.repository';
import { StorageAddressBookRepository } from '../repositories/address-book.repository';
import { SecureBiometricCredentialRepository } from '../repositories/biometric-credential.repository';
import { ChainModule, ChainRegistry } from '../repositories/chain/chain-registry';
import { createCosmosModule } from '../repositories/chain/cosmos/cosmos-module';
import { createGnoModule } from '../repositories/chain/gno/gno-module';
import { createCachedGnoProviderFactory } from '../repositories/chain/gno/gno-provider';
import { MarketDataRepository, MockMarketDataRepository } from '../repositories/market-data.repository';
import { StorageNetworkRepository } from '../repositories/network.repository';
import { StorageNftPreferenceRepository } from '../repositories/nft-preference.repository';
import { SecurePasswordAttemptRepository } from '../repositories/password-attempt.repository';
import { StoragePreferenceRepository } from '../repositories/preference.repository';
import { ApiPriceRepository, PriceRepository } from '../repositories/price.repository';
import { StorageTokenListRepository } from '../repositories/token-list.repository';
import { SecureVaultRepository } from '../repositories/vault.repository';
import { SecureStore } from '../security/secure-store';
import { ScryptXChaChaVaultCipher, VaultCipher } from '../security/vault-cipher';
import { AccountService } from '../services/account.service';
import { ActivityService } from '../services/activity.service';
import { AddressBookService } from '../services/address-book.service';
import { AppResetService } from '../services/app-reset.service';
import { BalanceService } from '../services/balance.service';
import { ExploreService } from '../services/explore.service';
import { KeyringSession } from '../services/keyring-session';
import { MarketDataService } from '../services/market-data.service';
import { MigrationService } from '../services/migration.service';
import { NetworkService } from '../services/network.service';
import { NftService } from '../services/nft.service';
import { PasswordAttemptLimiter } from '../services/password-attempt-limiter';
import { PreferenceService } from '../services/preference.service';
import { PriceService } from '../services/price.service';
import { TokenService } from '../services/token.service';
import { TransactionService } from '../services/transaction.service';
import { VaultService } from '../services/vault.service';
import { WalletService } from '../services/wallet.service';
import { KeyValueStore } from '../storage/key-value-store';

// Platform-level dependencies. Swap any of them to mock a layer.
export interface Infrastructure {
  secureStore: SecureStore;
  keyValueStore: KeyValueStore;
  vaultCipher?: VaultCipher;
  http?: HttpClient;
  chainModules?: ChainModule[];
  priceRepository?: PriceRepository;
  // Mock by default until a market data source is chosen.
  marketDataRepository?: MarketDataRepository;
  // Wall clock, injectable for tests.
  now?: () => number;
}

export interface Services {
  walletService: WalletService;
  accountService: AccountService;
  networkService: NetworkService;
  balanceService: BalanceService;
  tokenService: TokenService;
  priceService: PriceService;
  marketDataService: MarketDataService;
  nftService: NftService;
  activityService: ActivityService;
  addressBookService: AddressBookService;
  exploreService: ExploreService;
  appResetService: AppResetService;
  transactionService: TransactionService;
  preferenceService: PreferenceService;
  migrationService: MigrationService;
}

export type AppContainer = Services & { keyringSession: KeyringSession; chainRegistry: ChainRegistry };

export const createContainer = (infra: Infrastructure, overrides: Partial<Services> = {}): AppContainer => {
  const { secureStore, keyValueStore } = infra;

  const http = infra.http ?? new FetchHttpClient();
  // Networks of families without a registered module are filtered out by NetworkService.
  const defaultModules = [
    createGnoModule({ providerFactory: createCachedGnoProviderFactory(), http }),
    ...(FEATURES.atomone ? [createCosmosModule({ http })] : []),
  ];
  const chainRegistry = new ChainRegistry(infra.chainModules ?? defaultModules);
  const priceRepository = infra.priceRepository ?? new ApiPriceRepository(new OnblocApiClient(http));
  const vaultRepository = new SecureVaultRepository(secureStore);
  const biometricRepository = new SecureBiometricCredentialRepository(secureStore);
  const accountRepository = new StorageAccountRepository(keyValueStore);
  const networkRepository = new StorageNetworkRepository(keyValueStore);
  const preferenceRepository = new StoragePreferenceRepository(keyValueStore);
  const tokenListRepository = new StorageTokenListRepository(keyValueStore);

  const keyringSession = new KeyringSession();
  const attemptLimiter = new PasswordAttemptLimiter(new SecurePasswordAttemptRepository(secureStore), infra.now);
  const vaultService = new VaultService(vaultRepository, infra.vaultCipher ?? new ScryptXChaChaVaultCipher(), attemptLimiter);
  const accountService = overrides.accountService ?? new AccountService(accountRepository, keyringSession, chainRegistry);
  const networkService = overrides.networkService ?? new NetworkService(networkRepository, chainRegistry);
  const balanceService = overrides.balanceService ?? new BalanceService(chainRegistry, accountService);
  const transactionService = overrides.transactionService
    ?? new TransactionService(chainRegistry, accountService, keyringSession);
  const priceService = overrides.priceService ?? new PriceService(priceRepository);
  const tokenService = overrides.tokenService ?? new TokenService(chainRegistry, accountService, tokenListRepository);
  const nftService = overrides.nftService
    ?? new NftService(chainRegistry, accountService, new StorageNftPreferenceRepository(keyValueStore));
  const migrationService = overrides.migrationService ?? new MigrationService(keyValueStore, secureStore);

  return {
    keyringSession,
    chainRegistry,
    accountService,
    networkService,
    balanceService,
    transactionService,
    tokenService,
    priceService,
    marketDataService: overrides.marketDataService
      ?? new MarketDataService(infra.marketDataRepository ?? new MockMarketDataRepository(), priceService),
    nftService,
    addressBookService: overrides.addressBookService
      ?? new AddressBookService(new StorageAddressBookRepository(keyValueStore), chainRegistry),
    exploreService: overrides.exploreService ?? new ExploreService(),
    appResetService: overrides.appResetService ?? new AppResetService(keyringSession, vaultService, secureStore, keyValueStore, migrationService),
    activityService: overrides.activityService ?? new ActivityService(chainRegistry, accountService),
    walletService: overrides.walletService
      ?? new WalletService(vaultService, keyringSession, accountService, [tokenService, nftService], biometricRepository, preferenceRepository),
    preferenceService: overrides.preferenceService ?? new PreferenceService(preferenceRepository),
    migrationService,
  };
};
