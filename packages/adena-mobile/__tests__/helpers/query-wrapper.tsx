import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { PropsWithChildren, ReactElement } from 'react';

import { KeyringType } from '../../src/crypto/keyring';
import { AppContainer } from '../../src/di/container';
import { ContainerProvider } from '../../src/di/container-provider';
import { Account } from '../../src/domain/account';
import { ChainFamily, Network } from '../../src/domain/network';
import { NOOP_NOTIFICATION_API } from '../../src/infrastructure/http/notification-api.client';
import { StorageNotificationSettingRepository } from '../../src/repositories/notification-setting.repository';
import { StoragePreferenceRepository } from '../../src/repositories/preference.repository';
import { AccountService } from '../../src/services/account.service';
import { NetworkService } from '../../src/services/network.service';
import { NotificationService, UNAVAILABLE_PUSH_MESSAGING } from '../../src/services/notification.service';
import { PreferenceService } from '../../src/services/preference.service';
import { MemoryKeyValueStore } from '../../src/storage/memory-key-value-store';

export const NETWORK: Network = {
  id: 'gno-test',
  family: ChainFamily.GNO,
  chainId: 'test',
  chainName: 'Gno.land',
  networkName: 'Testnet',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.test',
  nativeToken: { id: 'ugnot', symbol: 'GNOT', denom: 'ugnot', decimals: 6 },
  feeToken: { id: 'ugnot', symbol: 'GNOT', denom: 'ugnot', decimals: 6 },
  defaultTokenIds: ['ugnot'],
  isMainnet: false,
  isCustom: false,
};

export const ACCOUNT: Account = { id: 'acc-1', keyringId: 'k', keyringType: KeyringType.HD_WALLET, name: 'A', hdIndex: 0, publicKey: 'pk', createdAt: 0 };

// Push unavailable and no server: settings work locally and sync never calls out.
export const createTestNotificationService = (): NotificationService => new NotificationService(
  new StorageNotificationSettingRepository(new MemoryKeyValueStore()),
  UNAVAILABLE_PUSH_MESSAGING,
  NOOP_NOTIFICATION_API,
  {} as AccountService,
  {} as NetworkService,
);

// Infinite gcTime: a mutation's default 5 min gc timer would keep Jest from exiting.
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });

// Wraps hooks with a fresh query client and a partial fake container; photos and haptics default to none,
// preferences to an in-memory store.
export const createWrapper = (services: Partial<Record<keyof AppContainer, unknown>>, client = createTestQueryClient()) => {
  const container = {
    accountPhotoService: { get: () => undefined },
    hapticsService: { play: () => undefined },
    preferenceService: new PreferenceService(new StoragePreferenceRepository(new MemoryKeyValueStore())),
    notificationService: createTestNotificationService(),
    ...services,
  } as unknown as AppContainer;
  const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
    <QueryClientProvider client={client}>
      <ContainerProvider container={container}>{children}</ContainerProvider>
    </QueryClientProvider>
  );

  return { Wrapper, client };
};
