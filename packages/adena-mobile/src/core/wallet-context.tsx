import {toGnoNetworkProfile} from '@common/mapper/network-profile-mapper';
import {AdenaStorage} from '@common/storage/storage';
import {isAutoLockTriggeredMessage} from '@common/utils/auto-lock-timer';
import type {NetworkMetainfo} from '@types';
import {
  Account,
  AdenaWallet,
  isHDWalletKeyring,
  PrivateKeyKeyring,
  SeedAccount,
  SingleAccount,
  Wallet,
} from 'adena-module';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  disableBiometricUnlock,
  enableBiometricUnlock,
  isBiometricUnlockEnabled,
  unlockWithBiometrics,
} from '../platform/biometric-unlock';
import type {MobilePlatform} from '../platform/install';
import {
  BaseServices,
  createBaseServices,
  createNetworkServices,
  NetworkServices,
} from './services';
import {
  checkPassword,
  PasswordCheck,
  passwordErrorMessage,
} from './unlock-throttle';

export type WalletStatus = 'loading' | 'no-wallet' | 'locked' | 'unlocked';

interface WalletContextValue {
  platform: MobilePlatform;
  base: BaseServices;
  net: NetworkServices | null;
  networks: NetworkMetainfo[];
  status: WalletStatus;
  wallet: Wallet | null;
  account: Account | null;
  address: string | null;
  /** User-chosen account names by account id (the extension's ACCOUNT_NAMES). */
  accountNames: Record<string, string>;
  biometricEnabled: boolean;
  createWallet(mnemonic: string, password: string): Promise<void>;
  /** `privateKeyHex` must already be validated (see core/private-key.ts). */
  importPrivateKey(privateKeyHex: string, password: string): Promise<void>;
  unlock(password: string): Promise<boolean>;
  unlockWithBiometrics(): Promise<boolean>;
  lock(): Promise<void>;
  /** Counts toward the shared attempt limit (core/unlock-throttle.ts). */
  verifyPassword(password: string): Promise<PasswordCheck>;
  /** `ok` once the password is changed; a wrong `current` counts as an attempt. */
  changePassword(current: string, next: string): Promise<PasswordCheck>;
  setBiometricUnlock(enabled: boolean, password?: string): Promise<void>;
  switchNetwork(networkId: string): Promise<void>;
  reloadNetworks(): Promise<NetworkMetainfo[]>;
  /** Stores the whole list after an add, edit or removal (custom networks). */
  saveNetworks(next: NetworkMetainfo[]): Promise<void>;
  resetWallet(): Promise<void>;
  switchAccount(accountId: string): Promise<void>;
  /**
   * Derives the next account of a seed phrase (the first one by default);
   * false without one.
   */
  addAccount(keyringId?: string): Promise<boolean>;
  /** Stores a wallet with added accounts (see core/account-import.ts). */
  saveAddedAccounts(next: AdenaWallet, currentAccountId: string): Promise<void>;
  renameAccount(accountId: string, name: string): Promise<void>;
  /** False for the last account: the wallet must be reset instead. */
  removeAccount(accountId: string): Promise<boolean>;
}

/** The name shown for an account: the user's choice, else the stored one. */
export function accountDisplayName(
  account: Account,
  names: Record<string, string>,
): string {
  return names[account.id] || account.name;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error('useWallet must be used inside WalletProvider');
  }
  return value;
}

export function WalletProvider({
  platform,
  children,
}: React.PropsWithChildren<{platform: MobilePlatform}>) {
  const base = useMemo(() => createBaseServices(), []);
  const [networks, setNetworks] = useState<NetworkMetainfo[]>([]);
  const [network, setNetwork] = useState<NetworkMetainfo | null>(null);
  const [status, setStatus] = useState<WalletStatus>('loading');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  // Bumped when the current account changes without a new wallet object.
  const [accountRevision, setAccountRevision] = useState(0);
  const walletRef = useRef<Wallet | null>(null);

  const net = useMemo(
    () => (network ? createNetworkServices(base, network) : null),
    [base, network],
  );

  // Signing paths ask the wallet service for the unlocked wallet; hand them
  // the instance this context holds instead of re-running Argon2id each time.
  // lockWallet and clear drop the resolver, so it is registered again for
  // every unlocked wallet, as the extension's WalletProvider does.
  useEffect(() => {
    base.walletService.setCurrentWalletResolver(() => walletRef.current);
    return () => base.walletService.setCurrentWalletResolver(null);
  }, [base, wallet]);

  // Custom networks resolve through the chain registry (connect, address
  // book), which starts with the built-in networks only.
  const registerNetworks = useCallback(
    (items: NetworkMetainfo[]) => {
      for (const item of items) {
        if (!item.deleted) {
          base.chainRegistry.register(toGnoNetworkProfile(item));
        }
      }
    },
    [base],
  );

  const forgetWallet = useCallback(() => {
    walletRef.current?.destroy();
    walletRef.current = null;
    setWallet(null);
    setAccount(null);
    setAddress(null);
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = await base.chainService.getNetworks();
      registerNetworks(loaded);
      const current = await base.chainService.getCurrentNetwork();
      setNetworks(loaded);
      setNetwork(current);
      setBiometricEnabled(await isBiometricUnlockEnabled());
      const exists = await base.walletService.existsWallet();
      setStatus(exists ? 'locked' : 'no-wallet');
    })();
  }, [base, registerNetworks]);

  // Auto-lock (idle, background) fires inside the platform layer.
  useEffect(
    () =>
      platform.messenger.onBroadcast(message => {
        if (isAutoLockTriggeredMessage(message)) {
          forgetWallet();
          setStatus(current => (current === 'unlocked' ? 'locked' : current));
        }
      }),
    [platform, forgetWallet],
  );

  // The current account and its address follow the wallet and the network.
  useEffect(() => {
    if (!wallet || !net) {
      return;
    }
    let cancelled = false;
    (async () => {
      const accountId = await net.accountService
        .getCurrentAccountId()
        .catch(() => '');
      const current =
        wallet.accounts.find(item => item.id === accountId) ??
        wallet.currentAccount;
      const currentAddress = await current.getAddress(
        net.network.addressPrefix,
      );
      if (!cancelled) {
        setAccount(current);
        setAddress(currentAddress);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet, net, accountRevision]);

  useEffect(() => {
    if (!wallet) {
      setAccountNames({});
      return;
    }
    base.accountRepository
      .getAccountNames()
      .catch(() => ({}))
      .then(names => setAccountNames(names ?? {}));
  }, [base, wallet]);

  const adoptWallet = useCallback(
    async (unlocked: Wallet) => {
      walletRef.current?.destroy();
      walletRef.current = unlocked;
      setWallet(unlocked);
      setStatus('unlocked');
      await platform.autoLock.reset();
    },
    [platform],
  );

  // The iOS Keychain outlives the app, so a biometric escrow from an earlier
  // install or wallet can still be there; it holds another password.
  const dropBiometricEscrow = useCallback(async () => {
    await disableBiometricUnlock();
    setBiometricEnabled(false);
  }, []);

  const createWallet = useCallback(
    async (mnemonic: string, password: string) => {
      await dropBiometricEscrow();
      const created = await base.walletService.createWallet({
        mnemonic,
        password,
      });
      await base.accountRepository.updateCurrentAccountId(
        created.currentAccount.id,
      );
      await adoptWallet(created);
    },
    [base, adoptWallet, dropBiometricEscrow],
  );

  // Same construction as the extension's wallet import with a private key.
  const importPrivateKey = useCallback(
    async (privateKeyHex: string, password: string) => {
      await dropBiometricEscrow();
      const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(privateKeyHex);
      const imported = await SingleAccount.createBy(keyring, 'Account');
      const created = new AdenaWallet();
      created.currentAccountId = imported.id;
      created.addAccount(imported);
      created.addKeyring(keyring);
      await base.walletService.saveWallet(created, password);
      await base.accountRepository.updateCurrentAccountId(imported.id);
      await adoptWallet(created);
    },
    [base, adoptWallet, dropBiometricEscrow],
  );

  const unlock = useCallback(
    async (password: string) => {
      try {
        const unlocked = await base.walletService.loadWalletWithPassword(
          password,
        );
        await adoptWallet(unlocked);
        return true;
      } catch {
        return false;
      }
    },
    [base, adoptWallet],
  );

  const unlockBiometric = useCallback(async () => {
    const password = await unlockWithBiometrics('Unlock Adena');
    if (!password) {
      setBiometricEnabled(await isBiometricUnlockEnabled());
      return false;
    }
    return unlock(password);
  }, [unlock]);

  const lock = useCallback(async () => {
    await base.walletService.lockWallet().catch(() => undefined);
    await platform.lock();
    forgetWallet();
    setStatus('locked');
  }, [base, platform, forgetWallet]);

  const verifyPassword = useCallback(
    (password: string) =>
      checkPassword(() => base.walletService.equalsPassword(password)),
    [base],
  );

  const changePassword = useCallback(
    async (current: string, next: string): Promise<PasswordCheck> => {
      const checked = await verifyPassword(current);
      if (!checked.ok) {
        return checked;
      }
      // The address book is sealed with the password too. The extension leaves
      // it under the old one, so it reads as empty after a change.
      const addressBook = await base.addressBookService
        .getAddressBook()
        .catch(() => []);
      const changed = await base.walletService.changePassword(next);
      if (changed && addressBook.length > 0) {
        const salt = await base.walletRepository.getKdfSalt();
        if (salt) {
          await base.addressRepository.updateAddressBook(
            addressBook,
            next,
            salt,
          );
        }
      }
      // The escrowed password is now stale; biometrics must be re-enabled.
      if (changed && (await isBiometricUnlockEnabled())) {
        await enableBiometricUnlock(next);
      }
      return changed ? {ok: true} : {ok: false, waitMs: 0};
    },
    [base, verifyPassword],
  );

  const setBiometricUnlock = useCallback(
    async (enabled: boolean, password?: string) => {
      if (enabled) {
        if (!password) {
          throw new Error(passwordErrorMessage(0));
        }
        const checked = await verifyPassword(password);
        if (!checked.ok) {
          throw new Error(passwordErrorMessage(checked.waitMs));
        }
        await enableBiometricUnlock(password);
      } else {
        await disableBiometricUnlock();
      }
      setBiometricEnabled(await isBiometricUnlockEnabled());
    },
    [verifyPassword],
  );

  const switchNetwork = useCallback(
    async (networkId: string) => {
      const target = (await base.chainService.getNetworks()).find(
        item => item.id === networkId,
      );
      if (!target) {
        return;
      }
      await base.chainService.updateCurrentNetworkId(networkId);
      setNetwork(target);
    },
    [base],
  );

  const reloadNetworks = useCallback(async () => {
    const loaded = await base.chainService.getNetworks();
    registerNetworks(loaded);
    setNetworks(loaded);
    return loaded;
  }, [base, registerNetworks]);

  const saveNetworks = useCallback(
    async (next: NetworkMetainfo[]) => {
      await base.chainService.updateNetworks(next);
      registerNetworks(next);
      setNetworks(next);
      const currentId = network?.id;
      const current = next.find(item => item.id === currentId && !item.deleted);
      if (current) {
        // A new object rebuilds the provider on the edited RPC.
        if (current !== network) {
          setNetwork(current);
        }
        return;
      }
      // The current network was removed: fall back as the extension does.
      const isMainnet = network?.main === true;
      const fallback =
        next.find(
          item => !item.deleted && (item.main === true) === isMainnet,
        ) ??
        next.find(item => !item.deleted) ??
        null;
      if (fallback) {
        await base.chainService.updateCurrentNetworkId(fallback.id);
      }
      setNetwork(fallback);
    },
    [base, network, registerNetworks],
  );

  const switchAccount = useCallback(
    async (accountId: string) => {
      await base.accountRepository.updateCurrentAccountId(accountId);
      setAccountRevision(value => value + 1);
    },
    [base],
  );

  /** Saves a changed copy of the wallet and makes it the one in use. */
  const commitWallet = useCallback(
    async (next: Wallet, currentAccountId: string) => {
      await base.walletService.updateWallet(next);
      await base.accountRepository.updateCurrentAccountId(currentAccountId);
      await adoptWallet(next);
    },
    [base, adoptWallet],
  );

  // The extension's account add: next HD path of the chosen seed phrase.
  const addAccount = useCallback(
    async (keyringId?: string) => {
      const current = walletRef.current;
      const keyring = current?.keyrings.find(
        item =>
          isHDWalletKeyring(item) &&
          (keyringId === undefined || item.id === keyringId),
      );
      if (!current || !keyring) {
        return false;
      }
      const next = current.clone();
      const created = await SeedAccount.createBy(
        keyring,
        `Account ${next.getNextAccountNumberBy(keyring)}`,
        next.getNextHDPathBy(keyring),
        next.getNextAccountIndexBy(keyring),
      );
      next.addAccount(created);
      next.currentAccountId = created.id;
      await commitWallet(next, created.id);
      return true;
    },
    [commitWallet],
  );

  const saveAddedAccounts = useCallback(
    async (next: AdenaWallet, currentAccountId: string) => {
      next.currentAccountId = currentAccountId;
      await commitWallet(next, currentAccountId);
    },
    [commitWallet],
  );

  const renameAccount = useCallback(
    async (accountId: string, name: string) => {
      const target = walletRef.current?.accounts.find(
        item => item.id === accountId,
      );
      if (!target) {
        return;
      }
      const next = {...accountNames, [accountId]: name.trim() || target.name};
      setAccountNames(next);
      await base.accountRepository.updateAccountNames(next);
    },
    [base, accountNames],
  );

  const removeAccount = useCallback(
    async (accountId: string) => {
      const current = walletRef.current;
      const target = current?.accounts.find(item => item.id === accountId);
      if (!current || !target || current.accounts.length <= 1) {
        return false;
      }
      const next = current.clone();
      next.removeAccount(next.accounts.find(item => item.id === accountId)!);
      const fallback = next.accounts[next.accounts.length - 1];
      next.currentAccountId = fallback.id;
      await commitWallet(next, fallback.id);
      await base.accountRepository
        .deleteAccountNameByAccountId(accountId)
        .catch(() => false);
      setAccountNames(names => {
        const rest = {...names};
        delete rest[accountId];
        return rest;
      });
      return true;
    },
    [base, commitWallet],
  );

  const resetWallet = useCallback(async () => {
    await platform.lock();
    forgetWallet();
    // Everything goes: vault, salt, accounts, connected sites, networks.
    await AdenaStorage.local().clear();
    await AdenaStorage.cache().clear();
    await disableBiometricUnlock();
    setBiometricEnabled(false);
    setStatus('no-wallet');
  }, [platform, forgetWallet]);

  const value: WalletContextValue = {
    platform,
    base,
    net,
    networks,
    status,
    wallet,
    account,
    address,
    accountNames,
    biometricEnabled,
    createWallet,
    importPrivateKey,
    unlock,
    unlockWithBiometrics: unlockBiometric,
    lock,
    verifyPassword,
    changePassword,
    setBiometricUnlock,
    switchNetwork,
    reloadNetworks,
    saveNetworks,
    resetWallet,
    switchAccount,
    addAccount,
    saveAddedAccounts,
    renameAccount,
    removeAccount,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
