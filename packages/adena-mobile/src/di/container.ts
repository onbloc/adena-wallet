import { FEATURES } from '../config/features';
import { AiLibraryLoader } from '../infrastructure/ai/ai-library';
import { GnoswapApiClient } from '../infrastructure/http/gnoswap-api.client';
import { FetchHttpClient, HttpClient } from '../infrastructure/http/http-client';
import { OnblocApiClient } from '../infrastructure/http/onbloc-api.client';
import { StorageAccountRepository } from '../repositories/account.repository';
import { StorageAccountPhotoRepository } from '../repositories/account-photo.repository';
import { StorageAddressBookRepository } from '../repositories/address-book.repository';
import { StorageAiChatRepository } from '../repositories/ai-chat.repository';
import { StorageAiSettingsRepository } from '../repositories/ai-settings.repository';
import { BiometricCredentialRepository, SecureBiometricCredentialRepository } from '../repositories/biometric-credential.repository';
import { ChainModule, ChainRegistry } from '../repositories/chain/chain-registry';
import { createCosmosModule } from '../repositories/chain/cosmos/cosmos-module';
import { createGnoModule } from '../repositories/chain/gno/gno-module';
import { createCachedGnoProviderFactory } from '../repositories/chain/gno/gno-provider';
import { StorageCloudBackupStateRepository } from '../repositories/cloud-backup/backup-state.repository';
import { CloudBackupProvider, CloudBackupStore } from '../repositories/cloud-backup/cloud-backup-store';
import { NativeCloudBackupStore } from '../repositories/cloud-backup/native-cloud-backup-store';
import { StorageConnectedAppRepository } from '../repositories/connected-app.repository';
import { DexMarketDataRepository, MarketDataRepository } from '../repositories/market-data.repository';
import { StorageNetworkRepository } from '../repositories/network.repository';
import { StorageNftPreferenceRepository } from '../repositories/nft-preference.repository';
import { SecurePasswordAttemptRepository } from '../repositories/password-attempt.repository';
import { PendingBroadcastRepository, StoragePendingBroadcastRepository } from '../repositories/pending-broadcast.repository';
import { StoragePreferenceRepository } from '../repositories/preference.repository';
import { ApiPriceRepository, PriceRepository } from '../repositories/price.repository';
import { StorageProcessedDappRequestRepository } from '../repositories/processed-dapp-request.repository';
import { StorageTokenListRepository } from '../repositories/token-list.repository';
import { SecureVaultRepository } from '../repositories/vault.repository';
import { DEX_API_CONFIG, ONRAMP_CONFIG, OnrampConfig } from '../resources';
import { BACKUP_KDF_SETTINGS, BackupCodec } from '../security/backup-codec';
import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { ScryptXChaChaVaultCipher, VaultCipher } from '../security/vault-cipher';
import { AccountService } from '../services/account.service';
import { AccountPhotoService } from '../services/account-photo.service';
import { ActivityService } from '../services/activity.service';
import { AddressBookService } from '../services/address-book.service';
import { AiAssistantService } from '../services/ai-assistant.service';
import { AiWalletService } from '../services/ai-wallet.service';
import { AppResetService } from '../services/app-reset.service';
import { BackupReminder } from '../services/backup-reminder';
import { BalanceService } from '../services/balance.service';
import { CloudBackupService } from '../services/cloud-backup.service';
import { ConnectedAppService } from '../services/connected-app.service';
import { DappService } from '../services/dapp.service';
import { HapticEngine, HapticsService, NOOP_HAPTIC_ENGINE } from '../services/haptics.service';
import { KeyringSession } from '../services/keyring-session';
import { MarketDataService } from '../services/market-data.service';
import { MigrationService } from '../services/migration.service';
import { NetworkService } from '../services/network.service';
import { NftService } from '../services/nft.service';
import { OnrampService } from '../services/onramp.service';
import { PasswordAttemptLimiter } from '../services/password-attempt-limiter';
import { PreferenceService } from '../services/preference.service';
import { PriceService } from '../services/price.service';
import { ResetMarker } from '../services/reset-marker';
import { RestoreMarker } from '../services/restore-marker';
import { SwapService } from '../services/swap.service';
import { TokenService } from '../services/token.service';
import { TransactionService } from '../services/transaction.service';
import { VaultService } from '../services/vault.service';
import { WalletService } from '../services/wallet.service';
import { KeyValueStore } from '../storage/key-value-store';
import { SerialQueue } from '../utils/serial-queue';

// Platform-level dependencies. Swap any of them to mock a layer.
export interface Infrastructure {
  secureStore: SecureStore;
  keyValueStore: KeyValueStore;
  // Platform override for the biometric password escrow (Android uses its own Keystore vault).
  biometricRepository?: BiometricCredentialRepository;
  vaultCipher?: VaultCipher;
  http?: HttpClient;
  chainModules?: ChainModule[];
  priceRepository?: PriceRepository;
  // Mock by default until a market data source is chosen.
  marketDataRepository?: MarketDataRepository;
  // iCloud on iOS, Google Drive on Android; unavailable when omitted.
  cloudBackupStore?: CloudBackupStore;
  backupCodec?: BackupCodec;
  // Wall clock, injectable for tests.
  now?: () => number;
  // Bundled onramp providers unless a test passes its own.
  onrampConfig?: OnrampConfig;
  // Silent unless the native container passes the device engine.
  hapticEngine?: HapticEngine;
  // Picks new accounts' avatar colors; injectable for deterministic tests.
  random?: () => number;
  // Loads the adena-ai library; tests pass a fake so no model or polyfill is needed.
  aiLibraryLoader?: AiLibraryLoader;
  // Streaming fetch for model and MCP calls (React Native's own fetch cannot stream).
  aiFetch?: typeof fetch;
  // Wallet mutation queue; defaults to the one shared by every container in this JS runtime.
  walletMutations?: SerialQueue;
}

// The main app and each Android inject sheet build their own container over the same storage. Sharing
// this queue lets a restore and another root's rollback check never interleave; keyring sessions stay separate.
const runtimeWalletMutations = new SerialQueue();

export interface Services {
  walletService: WalletService;
  accountService: AccountService;
  accountPhotoService: AccountPhotoService;
  hapticsService: HapticsService;
  networkService: NetworkService;
  balanceService: BalanceService;
  tokenService: TokenService;
  priceService: PriceService;
  marketDataService: MarketDataService;
  nftService: NftService;
  activityService: ActivityService;
  addressBookService: AddressBookService;
  onrampService: OnrampService;
  appResetService: AppResetService;
  transactionService: TransactionService;
  swapService: SwapService;
  dappService: DappService;
  connectedAppService: ConnectedAppService;
  preferenceService: PreferenceService;
  migrationService: MigrationService;
  cloudBackupService: CloudBackupService;
  backupReminder: BackupReminder;
  aiAssistantService: AiAssistantService;
}

export type AppContainer = Services & {
  keyringSession: KeyringSession;
  chainRegistry: ChainRegistry;
  pendingBroadcastRepository: PendingBroadcastRepository;
};

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
  const biometricRepository = infra.biometricRepository ?? new SecureBiometricCredentialRepository(secureStore);
  const backupReminder = overrides.backupReminder ?? new BackupReminder(keyValueStore);
  const accountRepository = new StorageAccountRepository(keyValueStore);
  const networkRepository = new StorageNetworkRepository(keyValueStore);
  const connectedAppRepository = new StorageConnectedAppRepository(keyValueStore);
  const preferenceRepository = new StoragePreferenceRepository(keyValueStore);
  const tokenListRepository = new StorageTokenListRepository(keyValueStore);
  const pendingBroadcastRepository = new StoragePendingBroadcastRepository(keyValueStore);

  const keyringSession = new KeyringSession();
  const attemptLimiter = new PasswordAttemptLimiter(new SecurePasswordAttemptRepository(secureStore), infra.now);
  const vaultService = new VaultService(vaultRepository, infra.vaultCipher ?? new ScryptXChaChaVaultCipher(), attemptLimiter);
  const clearAiPending = (): void => aiAssistantService.clearAllPending();
  const accountService = overrides.accountService ?? new AccountService(accountRepository, keyringSession, chainRegistry, infra.random, infra.walletMutations ?? runtimeWalletMutations);
  const accountPhotoService = overrides.accountPhotoService ?? new AccountPhotoService(new StorageAccountPhotoRepository(keyValueStore));
  const networkService = overrides.networkService ?? new NetworkService(networkRepository, chainRegistry, undefined, clearAiPending);
  const balanceService = overrides.balanceService ?? new BalanceService(chainRegistry, accountService);
  const transactionService = overrides.transactionService
    ?? new TransactionService(chainRegistry, accountService, keyringSession, pendingBroadcastRepository);
  const connectedAppService = overrides.connectedAppService ?? new ConnectedAppService(connectedAppRepository);
  const priceService = overrides.priceService ?? new PriceService(priceRepository);
  const tokenService = overrides.tokenService ?? new TokenService(chainRegistry, accountService, tokenListRepository);
  const nftService = overrides.nftService
    ?? new NftService(chainRegistry, accountService, new StorageNftPreferenceRepository(keyValueStore));
  const resetMarker = new ResetMarker(keyValueStore);
  const migrationService = overrides.migrationService ?? new MigrationService(keyValueStore, secureStore);
  const cloudBackupStateRepository = new StorageCloudBackupStateRepository(keyValueStore);
  const addressBookService = overrides.addressBookService
    ?? new AddressBookService(new StorageAddressBookRepository(keyValueStore), chainRegistry);
  const aiAssistantService = overrides.aiAssistantService ?? new AiAssistantService(
    new StorageAiSettingsRepository(keyValueStore, secureStore),
    new StorageAiChatRepository(keyValueStore),
    new AiWalletService(accountService, tokenService, transactionService, addressBookService),
    accountService,
    infra.aiLibraryLoader,
    infra.aiFetch,
  );
  const walletService = overrides.walletService
    ?? new WalletService(vaultService, keyringSession, accountService, [tokenService, nftService, connectedAppService, accountPhotoService, pendingBroadcastRepository, aiAssistantService], biometricRepository, preferenceRepository, resetMarker, new RestoreMarker(keyValueStore), cloudBackupStateRepository, backupReminder);
  const cloudBackupService = overrides.cloudBackupService ?? new CloudBackupService(
    infra.cloudBackupStore ?? new NativeCloudBackupStore(null, CloudBackupProvider.ICLOUD),
    infra.backupCodec ?? new BackupCodec(new ScryptXChaChaVaultCipher(BACKUP_KDF_SETTINGS)),
    cloudBackupStateRepository,
    vaultService,
    accountService,
    walletService,
    new PasswordAttemptLimiter(new SecurePasswordAttemptRepository(secureStore, SecureKey.BACKUP_PASSWORD_ATTEMPTS), infra.now),
    infra.now,
  );

  return {
    keyringSession,
    chainRegistry,
    pendingBroadcastRepository,
    accountService,
    accountPhotoService,
    hapticsService: overrides.hapticsService ?? new HapticsService(preferenceRepository, infra.hapticEngine ?? NOOP_HAPTIC_ENGINE),
    networkService,
    balanceService,
    transactionService,
    swapService: overrides.swapService ?? new SwapService(chainRegistry, accountService, transactionService, DEX_API_CONFIG, infra.now),
    connectedAppService,
    tokenService,
    priceService,
    marketDataService: overrides.marketDataService
      ?? new MarketDataService(infra.marketDataRepository ?? new DexMarketDataRepository(new GnoswapApiClient(http), DEX_API_CONFIG, infra.now)),
    nftService,
    addressBookService,
    aiAssistantService,
    onrampService: overrides.onrampService ?? new OnrampService(infra.onrampConfig ?? ONRAMP_CONFIG),
    appResetService: overrides.appResetService ?? new AppResetService(keyringSession, vaultService, secureStore, keyValueStore, migrationService, resetMarker),
    activityService: overrides.activityService ?? new ActivityService(chainRegistry, accountService),
    walletService,
    dappService: overrides.dappService
      ?? new DappService(networkService, accountService, transactionService, connectedAppService, new StorageProcessedDappRequestRepository(keyValueStore, infra.now), infra.now),
    preferenceService: overrides.preferenceService ?? new PreferenceService(preferenceRepository),
    migrationService,
    cloudBackupService,
    backupReminder,
  };
};
