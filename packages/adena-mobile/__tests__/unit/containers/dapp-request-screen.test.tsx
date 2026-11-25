import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { DappRequestPage, DappRequestPageProps } from '../../../src/components/pages';
import { DappRequestScreen } from '../../../src/containers/main/dapp-request-screen';
import { TransactionPendingError } from '../../../src/core/errors';
import { decodeBase64Url } from '../../../src/deeplink/base64url';
import { buildDappRequestUrl, DappRequestPayload, parseDappRequestUrl } from '../../../src/deeplink/dapp-protocol';
import { DappRequest } from '../../../src/domain/dapp';
import { useDappRequestStore } from '../../../src/stores/dapp-request.store';
import { useSessionStore } from '../../../src/stores/session.store';
import { createMockNavigation, renderScreen, resetStores, setupWallet, TestEnv } from '../../helpers/render-screen';

jest.mock('../../../src/components/pages', () => {
  const actual = jest.requireActual('../../../src/components/pages');

  return { ...actual, DappRequestPage: jest.fn(actual.DappRequestPage) };
});

const ORIGIN = 'https://dapp.example.com';
const pageProps = (): DappRequestPageProps => jest.mocked(DappRequestPage).mock.calls.at(-1)![0];
const client = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });

const readResponse = (callbackUrl: string) => JSON.parse(decodeBase64Url(decodeURIComponent(new URL(callbackUrl).searchParams.get('response') ?? '')));

const activate = (overrides: Partial<DappRequestPayload> = {}, patch: Partial<DappRequest> = {}): DappRequest => {
  const url = buildDappRequestUrl({ version: 1, id: 'req-1', method: 'connect', callback: `${ORIGIN}/cb`, dapp: { name: 'Example' }, ...overrides });
  const request = { ...parseDappRequestUrl(url), ...patch } as DappRequest;

  useDappRequestStore.getState().setActive({ url, request });
  return request;
};

const callRequest = (address: string, chainId = 'gnoland-1'): Partial<DappRequestPayload> => ({
  method: 'sign-and-broadcast',
  expiresAt: Date.now() + 600_000,
  chainId,
  params: { memo: 'hello memo', messages: [{ type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } }] },
});

const connect = (env: TestEnv): void => {
  const account = env.container.accountService.getCurrentAccount()!;

  env.container.connectedAppService.touch(ORIGIN, { name: 'Example' }, account.id, env.container.networkService.getCurrentNetwork().id);
};

jest.setTimeout(30_000);

describe('DappRequestScreen', () => {
  const openURL = jest.mocked(Linking.openURL);

  beforeEach(() => {
    resetStores();
    openURL.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders nothing without an active request', async () => {
    const { env } = await setupWallet();

    await renderScreen(DappRequestScreen, { env, client: client() });

    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('approves a connect request and answers through the callback', async () => {
    const { env, address } = await setupWallet();

    activate();
    const { navigation } = await renderScreen(DappRequestScreen, { env, client: client() });

    expect(screen.getByText('Connect app')).toBeTruthy();
    expect(screen.getByText(address)).toBeTruthy();
    expect(screen.queryByText('Memo')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'success', data: { address } });
    expect(useDappRequestStore.getState()).toMatchObject({ active: null, inFlight: false });
    expect(navigation.goBack).toHaveBeenCalled();
    expect(env.container.connectedAppService.getConnectedApps()).toHaveLength(1);
  });

  it('rejects without going back when there is no screen below and swallows callback failures', async () => {
    const { env } = await setupWallet();
    const navigation = createMockNavigation();

    navigation.canGoBack.mockReturnValue(false);
    openURL.mockRejectedValue(new Error('no handler'));
    activate();
    await renderScreen(DappRequestScreen, { env, navigation, client: client() });
    await fireEvent.press(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'failure' });
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(useDappRequestStore.getState().active).toBeNull();
  });

  it('reports NOT_CONNECTED for a transaction from an unknown site', async () => {
    const { env, address } = await setupWallet();

    activate(callRequest(address));
    await renderScreen(DappRequestScreen, { env, client: client() });

    expect(screen.getByText(`${ORIGIN} is not connected to this account. Connect the app first.`)).toBeTruthy();
    expect(screen.getByText('gnoland-1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'failure', error: { code: 'NOT_CONNECTED' } });
  });

  it('falls back to placeholders when no account is available', async () => {
    const { env } = await setupWallet();

    activate({}, { chainId: undefined });
    env.container.accountService.clear();
    await renderScreen(DappRequestScreen, { env, client: client() });

    expect(screen.getByText('No account available')).toBeTruthy();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });

  it('signs and broadcasts a connected transaction', async () => {
    const { env, address } = await setupWallet();

    connect(env);
    activate(callRequest(address));
    await renderScreen(DappRequestScreen, { env, client: client() });

    expect(screen.getByText('hello memo')).toBeTruthy();
    expect(await screen.findByText('Network fee', {}, { timeout: 10_000 })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'success', data: { hash: 'HASH' } });
    expect(env.gno.state.broadcasts).toHaveLength(1);
  });

  it('signs once and ignores reject when approve is tapped twice before re-rendering', async () => {
    const { env, address } = await setupWallet();
    let settle: (url: string) => void = () => undefined;
    const approveTransaction = jest.spyOn(env.container.dappService, 'approveTransaction')
      .mockImplementation(() => new Promise<string>((resolve) => {
        settle = resolve;
      }));

    connect(env);
    activate(callRequest(address));
    await renderScreen(DappRequestScreen, { env, client: client() });
    await screen.findByText('Network fee', {}, { timeout: 10_000 });
    const { onApprove, onReject } = pageProps();

    await act(async () => {
      onApprove();
      onApprove();
      onReject();
    });
    await waitFor(() => expect(approveTransaction).toHaveBeenCalledTimes(1));
    expect(openURL).not.toHaveBeenCalled();
    await act(async () => settle(`${ORIGIN}/cb?response=ok`));
    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(approveTransaction).toHaveBeenCalledTimes(1);
  });

  it('stays on the request when the broadcast fails', async () => {
    const { env, address } = await setupWallet();

    connect(env);
    jest.spyOn(env.container.dappService, 'approveTransaction').mockRejectedValue(new Error('broadcast failed'));
    activate(callRequest(address));
    const { navigation } = await renderScreen(DappRequestScreen, { env, client: client() });

    await screen.findByText('Network fee', {}, { timeout: 10_000 });
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('broadcast failed')).toBeTruthy();
    expect(openURL).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(useDappRequestStore.getState()).toMatchObject({ inFlight: false, active: expect.anything() });
  });

  it('answers an unknown broadcast outcome with its code and hash, not a rejection', async () => {
    const { env, address } = await setupWallet();

    connect(env);
    jest.spyOn(env.container.transactionService, 'signAndBroadcast').mockRejectedValue(new TransactionPendingError('PENDINGHASH'));
    activate(callRequest(address));
    await renderScreen(DappRequestScreen, { env, client: client() });

    await screen.findByText('Network fee', {}, { timeout: 10_000 });
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(pageProps().canApprove).toBe(false));
    await act(async () => pageProps().onReject());

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'failure', error: { code: 'TRANSACTION_PENDING' }, data: { hash: 'PENDINGHASH' } });
  });

  it('asks to switch networks and switches on confirm', async () => {
    const { env, address } = await setupWallet();

    connect(env);
    activate(callRequest(address, 'onyx-1'));
    await renderScreen(DappRequestScreen, { env, client: client() });

    expect(screen.getByText('Switch network?')).toBeTruthy();
    expect(screen.getByText('Use Onyx for this action.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(env.container.networkService.getCurrentNetwork().id).toBe('onyx-1');
    expect(useSessionStore.getState().revision).toBe(1);
    await waitFor(() => expect(screen.queryByText('Switch network?')).toBeNull());
  });

  it('rejects the request when the network switch is declined', async () => {
    const { env, address } = await setupWallet();

    connect(env);
    activate(callRequest(address, 'onyx-1'));
    await renderScreen(DappRequestScreen, { env, client: client() });
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'failure' });
    expect(env.container.networkService.getCurrentNetwork().id).toBe('gnoland-1');
  });

  describe('when the review crashes', () => {
    beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));

    it('answers the dApp with an error and leaves', async () => {
      const { env } = await setupWallet();

      activate({}, { method: 'bogus' as never });
      const { navigation } = await renderScreen(DappRequestScreen, { env, client: client() });

      await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
      expect(readResponse(openURL.mock.calls[0][0])).toMatchObject({ status: 'failure' });
      expect(useDappRequestStore.getState().active).toBeNull();
      expect(navigation.goBack).toHaveBeenCalled();
    });

    it('does not go back without a screen below and swallows callback failures', async () => {
      const { env } = await setupWallet();
      const navigation = createMockNavigation();

      navigation.canGoBack.mockReturnValue(false);
      openURL.mockRejectedValue(new Error('no handler'));
      activate({}, { method: 'bogus' as never });
      await renderScreen(DappRequestScreen, { env, navigation, client: client() });

      await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    it('leaves an in-flight request alone', async () => {
      const { env } = await setupWallet();

      activate({}, { method: 'bogus' as never });
      useDappRequestStore.getState().setInFlight(true);
      const { navigation } = await renderScreen(DappRequestScreen, { env, client: client() });

      expect(openURL).not.toHaveBeenCalled();
      expect(navigation.goBack).not.toHaveBeenCalled();
      expect(useDappRequestStore.getState().active).not.toBeNull();
    });
  });
});
