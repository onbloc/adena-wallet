import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppError, AppErrorCode } from '../src/core/errors';
import { decodeBase64Url } from '../src/deeplink/base64url';
import { buildDappRequestUrl } from '../src/deeplink/dapp-protocol';
import { ContainerProvider } from '../src/di/container-provider';
import { createSheetSession, InjectSheetScreen } from '../src/inject-sheet/inject-sheet-screen';
import NativeAdenaInjectSheet from '../src/native/NativeAdenaInjectSheet';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

jest.mock('../src/native/NativeAdenaInjectSheet', () => ({ __esModule: true, default: { complete: jest.fn(), dismiss: jest.fn(), setBusy: jest.fn() } }));

const native = NativeAdenaInjectSheet as unknown as { complete: jest.Mock; dismiss: jest.Mock };
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderSheet = async (container: ReturnType<typeof createTestContainer>['container'], requestUrl?: string): Promise<void> => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ContainerProvider container={container}>
        <QueryClientProvider client={client}>
          <InjectSheetScreen requestUrl={requestUrl} session={createSheetSession('sheet-1')} />
        </QueryClientProvider>
      </ContainerProvider>
    </SafeAreaProvider>,
  );
};

const request = (overrides: object): string => buildDappRequestUrl({
  version: 1,
  id: 'req-1',
  method: 'connect',
  callback: 'exampleapp://adena',
  dapp: { name: 'Example' },
  ...overrides,
});

describe('Android overlay inject sheet', () => {
  beforeEach(() => {
    native.complete.mockReset();
    native.dismiss.mockReset();
  });

  it('signs with biometrics, returns the response natively and locks again', async () => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    await env.container.walletService.enableBiometricUnlock(TEST_PASSWORD);
    env.container.walletService.lock();
    const network = env.container.networkService.getCurrentNetwork();

    env.container.connectedAppService.touch('exampleapp:', { name: 'Example' }, account.id, network.id);
    const address = env.container.accountService.getAddress(account, network);

    await renderSheet(env.container, request({
      method: 'sign-and-broadcast',
      chainId: 'gnoland-1',
      params: { messages: [{ type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/demo/counter', func: 'Increment' } }] },
    }));

    const approve = await screen.findByRole('button', { name: 'Approve' });

    await waitFor(() => expect(screen.getByText('Network fee')).toBeTruthy());
    await fireEvent.press(approve);

    await waitFor(() => expect(native.complete).toHaveBeenCalledTimes(1));
    expect(native.complete.mock.calls[0][0]).toBe('sheet-1');
    expect(native.complete.mock.calls[0][1]).toMatch(/^exampleapp:\/\/adena\?response=/);
    expect(env.gno.state.broadcasts).toHaveLength(1);
    expect(env.container.keyringSession.isUnlocked()).toBe(false);
  });

  it('answers a failed approval with its error instead of a rejection', async () => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const network = env.container.networkService.getCurrentNetwork();

    env.container.walletService.lock();
    env.container.connectedAppService.touch('exampleapp:', { name: 'Example' }, account.id, network.id);
    jest.spyOn(env.container.transactionService, 'signAndBroadcast')
      .mockRejectedValue(new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, 'A previous transaction is not confirmed yet.'));
    await renderSheet(env.container, request({
      method: 'sign-and-broadcast',
      chainId: 'gnoland-1',
      params: { messages: [{ type: '/vm.m_call', value: { caller: env.container.accountService.getAddress(account, network), pkg_path: 'gno.land/r/demo/counter', func: 'Increment' } }] },
    }));

    await waitFor(() => expect(screen.getByText('Network fee')).toBeTruthy());
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('A previous transaction is not confirmed yet.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reject' }));

    const response = new URL(native.complete.mock.calls[0][1]).searchParams.get('response') ?? '';

    expect(JSON.parse(decodeBase64Url(response))).toMatchObject({ status: 'failure', error: { code: 'PREVIOUS_TRANSACTION_PENDING' } });
  });

  it('answers a rejection through the callback', async () => {
    const env = createTestContainer();

    await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    await renderSheet(env.container, request({}));
    await fireEvent.press(await screen.findByRole('button', { name: 'Reject' }));
    expect(native.complete).toHaveBeenCalledWith('sheet-1', expect.stringMatching(/^exampleapp:\/\/adena\?response=/));
  });

  it('answers a reopened request with a duplicate error instead of prompting again', async () => {
    const env = createTestContainer();

    await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    await renderSheet(env.container, request({}));
    await fireEvent.press(await screen.findByRole('button', { name: 'Reject' }));
    await renderSheet(env.container, request({}));
    expect(await screen.findByText('Request already handled')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(native.complete).toHaveBeenCalledTimes(2);
    expect(native.complete.mock.calls[1][1]).toMatch(/^exampleapp:\/\/adena\?response=/);
  });

  it('connects only after the wallet password is entered', async () => {
    const env = createTestContainer();

    await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    env.container.walletService.lock();
    await renderSheet(env.container, request({}));
    const connect = await screen.findByRole('button', { name: 'Connect' });

    expect(connect.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(native.complete).toHaveBeenCalledTimes(1));
    expect(env.container.keyringSession.isUnlocked()).toBe(false);
  });

  it('shows the full MsgRun source and enables approval only after every file was opened', async () => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const network = env.container.networkService.getCurrentNetwork();
    const address = env.container.accountService.getAddress(account, network);

    env.container.walletService.lock();
    env.container.connectedAppService.touch('exampleapp:', { name: 'Example' }, account.id, network.id);
    await renderSheet(env.container, request({
      method: 'sign-and-broadcast',
      chainId: 'gnoland-1',
      params: {
        messages: [{
          type: '/vm.m_run',
          value: { caller: address, send: '', package: { name: 'main', path: '', files: [{ name: 'script.gno', body: 'package main\n\nfunc main() { drain() }' }] } },
        }],
      },
    }));

    expect(await screen.findByText(/runs code with your account's permissions/)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), TEST_PASSWORD);
    expect(screen.getByRole('button', { name: 'Approve' }).props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('dapp-code-toggle-0:0'));
    expect(screen.getByTestId('dapp-code-body-0:0').props.children).toBe('package main\n\nfunc main() { drain() }');
    expect(screen.getByRole('button', { name: 'Approve' }).props.accessibilityState?.disabled).toBe(false);
  });

  it('only offers to close when there is no wallet or the link is invalid', async () => {
    const env = createTestContainer();

    await renderSheet(env.container, request({}));
    expect(await screen.findByText('Set up Adena first')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(native.dismiss).toHaveBeenCalled();

    await renderSheet(env.container, 'adena://request?payload=broken');
    expect(await screen.findByText('Invalid request')).toBeTruthy();
  });
});
