import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { PropsWithChildren, ReactElement } from 'react';

import { KeyringType } from '../../src/crypto/keyring';
import { AppContainer } from '../../src/di/container';
import { ContainerProvider } from '../../src/di/container-provider';
import { Account } from '../../src/domain/account';
import { ChainFamily, Network } from '../../src/domain/network';

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

export const createTestQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

// Wraps hooks with a fresh query client and a partial fake container; photos and haptics default to none.
export const createWrapper = (services: Partial<Record<keyof AppContainer, unknown>>, client = createTestQueryClient()) => {
  const container = { accountPhotoService: { get: () => undefined }, hapticsService: { play: () => undefined }, ...services } as unknown as AppContainer;
  const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
    <QueryClientProvider client={client}>
      <ContainerProvider container={container}>{children}</ContainerProvider>
    </QueryClientProvider>
  );

  return { Wrapper, client };
};
