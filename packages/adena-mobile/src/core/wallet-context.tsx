import {AdenaStorage} from '@common/storage/storage';
import {isAutoLockTriggeredMessage} from '@common/utils/auto-lock-timer';
import type {NetworkMetainfo} from '@types';
import type {Account, Wallet} from 'adena-module';
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
  biometricEnabled: boolean;
  createWallet(mnemonic: string, password: string): Promise<void>;
  unlock(password: string): Promise<boolean>;
  unlockWithBiometrics(): Promise<boolean>;
  lock(): Promise<void>;
  verifyPassword(password: string): Promise<boolean>;
  changePassword(current: string, next: string): Promise<boolean>;
  setBiometricUnlock(enabled: boolean, password?: string): Promise<void>;
  switchNetwork(networkId: string): Promise<void>;
  reloadNetworks(): Promise<NetworkMetainfo[]>;
  resetWallet(): Promise<void>;
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
  const walletRef = useRef<Wallet | null>(null);

  const net = useMemo(
    () => (network ? createNetworkServices(base, network) : null),
    [base, network],
  );

  // Signing paths ask the wallet service for the unlocked wallet; hand them
  // the instance this context holds instead of re-running Argon2id each time.
  useEffect(() => {
    base.walletService.setCurrentWalletResolver(() => walletRef.current);
  }, [base]);

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
      const current = await base.chainService.getCurrentNetwork();
      setNetworks(loaded);
      setNetwork(current);
      setBiometricEnabled(await isBiometricUnlockEnabled());
      const exists = await base.walletService.existsWallet();
      setStatus(exists ? 'locked' : 'no-wallet');
    })();
  }, [base]);

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
  }, [wallet, net]);

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

  const createWallet = useCallback(
    async (mnemonic: string, password: string) => {
      const created = await base.walletService.createWallet({
        mnemonic,
        password,
      });
      await base.accountRepository.updateCurrentAccountId(
        created.currentAccount.id,
      );
      await adoptWallet(created);
    },
    [base, adoptWallet],
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
    (password: string) => base.walletService.equalsPassword(password),
    [base],
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!(await base.walletService.equalsPassword(current))) {
        return false;
      }
      const changed = await base.walletService.changePassword(next);
      // The escrowed password is now stale; biometrics must be re-enabled.
      if (changed && (await isBiometricUnlockEnabled())) {
        await enableBiometricUnlock(next);
      }
      return changed;
    },
    [base],
  );

  const setBiometricUnlock = useCallback(
    async (enabled: boolean, password?: string) => {
      if (enabled) {
        if (!password || !(await base.walletService.equalsPassword(password))) {
          throw new Error('The password is incorrect');
        }
        await enableBiometricUnlock(password);
      } else {
        await disableBiometricUnlock();
      }
      setBiometricEnabled(await isBiometricUnlockEnabled());
    },
    [base],
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
    setNetworks(loaded);
    return loaded;
  }, [base]);

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
    biometricEnabled,
    createWallet,
    unlock,
    unlockWithBiometrics: unlockBiometric,
    lock,
    verifyPassword,
    changePassword,
    setBiometricUnlock,
    switchNetwork,
    reloadNetworks,
    resetWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
