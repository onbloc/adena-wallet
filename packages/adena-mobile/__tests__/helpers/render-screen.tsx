import { NavigationContext } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import React, { ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContainerProvider } from '../../src/di/container-provider';
import { useDappRequestStore } from '../../src/stores/dapp-request.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../src/stores/session.store';
import { useToastStore } from '../../src/stores/toast.store';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './test-container';

export const SAFE_AREA_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

export type TestEnv = ReturnType<typeof createTestContainer>;

export const createMockNavigation = () => {
  const listeners: Record<string, (() => void)[]> = {};

  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    popTo: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    getParent: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
    addListener: jest.fn((event: string, callback: () => void) => {
      (listeners[event] ??= []).push(callback);
      return (): void => {
        listeners[event] = listeners[event].filter(item => item !== callback);
      };
    }),
    removeListener: jest.fn(),
    emit: (event: string): void => (listeners[event] ?? []).forEach(callback => callback()),
  };
};

export type MockNavigation = ReturnType<typeof createMockNavigation>;

export const resetStores = (): void => {
  useSessionStore.setState({ status: SessionStatus.BOOTING, revision: 0 });
  useOnboardingStore.getState().clear();
  useToastStore.setState({ toast: null });
  useDappRequestStore.setState({ queue: [], active: null, inFlight: false });
};

export const createQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });

export interface RenderScreenOptions {
  env?: TestEnv;
  params?: unknown;
  navigation?: MockNavigation;
  client?: QueryClient;
}

// Renders a screen container with a real in-memory DI container and a mock navigation prop.
export const renderScreen = async <P extends object>(Screen: ComponentType<P>, options: RenderScreenOptions = {}) => {
  const env = options.env ?? createTestContainer();
  const navigation = options.navigation ?? createMockNavigation();
  const client = options.client ?? createQueryClient();
  const route = { key: 'test-route', name: 'Test', params: options.params };
  const props = { navigation, route } as unknown as P;
  const element = (
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <ContainerProvider container={env.container}>
        <QueryClientProvider client={client}>
          <NavigationContext value={navigation as never}>
            <Screen {...props} />
          </NavigationContext>
        </QueryClientProvider>
      </ContainerProvider>
    </SafeAreaProvider>
  );
  const result = await render(element);

  return { ...result, env, navigation, client, route };
};

// Creates the wallet the way onboarding does and leaves it unlocked.
export const setupWallet = async (env: TestEnv = createTestContainer()) => {
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  const network = env.container.networkService.getCurrentNetwork();
  const address = env.container.accountService.getAddress(account, network);

  return { env, account, network, address };
};

export const toastMessage = (): string | undefined => useToastStore.getState().toast?.message;
