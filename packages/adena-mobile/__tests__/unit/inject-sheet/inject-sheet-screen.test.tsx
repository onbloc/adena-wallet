import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { InjectSheetPage, InjectSheetPageProps, SheetAuthMode } from '../../../src/components/pages';
import { AppError, AppErrorCode, BIOMETRICS_INVALIDATED_MESSAGE } from '../../../src/core/errors';
import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { DappRequestFlowOptions, useDappRequestFlow } from '../../../src/hooks/use-dapp-request-flow';
import { createSheetSession, finishSheet, InjectSheetScreen, SheetSession } from '../../../src/inject-sheet/inject-sheet-screen';
import { queryKeys } from '../../../src/queries/query-keys';
import { useBiometricStatusQuery, useWalletStatusQuery } from '../../../src/queries/wallet.queries';
import { BiometryKind } from '../../../src/security/secure-store';
import { WalletStatus } from '../../../src/services/wallet.service';

type MockNative = { complete: jest.Mock; dismiss: jest.Mock; setBusy: jest.Mock };
const createNative = (): MockNative => ({ complete: jest.fn(), dismiss: jest.fn(), setBusy: jest.fn() });
const mockNative = { current: createNative() as MockNative | null };

jest.mock('../../../src/native/NativeAdenaInjectSheet', () => ({
  __esModule: true,
  get default() {
    return mockNative.current;
  },
}));
jest.mock('../../../src/components/pages', () => ({
  ...jest.requireActual('../../../src/components/pages'),
  InjectSheetPage: jest.fn(() => null),
}));
jest.mock('../../../src/hooks/use-dapp-request-flow', () => ({ useDappRequestFlow: jest.fn() }));
jest.mock('../../../src/queries/wallet.queries', () => ({ useWalletStatusQuery: jest.fn(), useBiometricStatusQuery: jest.fn() }));

const context = {
  network: { chainName: 'Gno.land', networkName: 'Mainnet' },
  account: { name: 'Account 1' },
  address: 'g1abc',
};

const flow = (overrides: object = {}) => ({
  request: { dapp: { name: 'Example' }, callbackOrigin: 'exampleapp:' },
  context,
  isTransaction: true,
  title: 'Confirm transaction',
  approveLabel: 'Approve',
  messages: [],
  feeLabel: '0.1 GNOT',
  feeWarning: undefined,
  expandedCode: [],
  toggleCode: jest.fn(),
  codeReviewPending: false,
  loading: false,
  error: undefined,
  canApprove: true,
  approving: false,
  approve: jest.fn().mockResolvedValue('cb://ok'),
  resetApproval: jest.fn(),
  rejectionUrl: jest.fn(() => 'cb://reject'),
  ...overrides,
});

const page = (): InjectSheetPageProps => (InjectSheetPage as unknown as jest.Mock).mock.calls.at(-1)[0];
const flowOptions = (): DappRequestFlowOptions => (useDappRequestFlow as jest.Mock).mock.calls.at(-1)[1];
const flowRequest = () => (useDappRequestFlow as jest.Mock).mock.calls.at(-1)[0];

describe('finishSheet', () => {
  beforeEach(() => {
    mockNative.current = createNative();
  });

  it('completes natively the sheet with the token', () => {
    finishSheet('sheet-1', 'cb://x');
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://x');
  });

  it('dismisses natively the sheet with the token', () => {
    finishSheet('sheet-1', null);
    expect(mockNative.current?.dismiss).toHaveBeenCalledWith('sheet-1');
  });

  it('opens the callback url without the native module and ignores failures', async () => {
    mockNative.current = null;
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));

    finishSheet('sheet-1', 'cb://x');
    finishSheet('sheet-1', null);
    await act(async () => undefined);
    expect(openURL).toHaveBeenCalledTimes(1);
    openURL.mockRestore();
  });
});

describe('InjectSheetScreen', () => {
  const parseRequestUrl = jest.fn((url: string, _caller?: string) => ({ requestId: url }));
  const isProcessed = jest.fn((_request: unknown) => false);
  const answerDuplicate = jest.fn((_request: unknown) => 'cb://duplicate');
  const reconcile = jest.fn((_request: unknown) => Promise.resolve());
  const walletService = { unlock: jest.fn(), unlockWithBiometrics: jest.fn(), lock: jest.fn() };
  const container = { dappService: { parseRequestUrl, isProcessed, answerDuplicate, reconcile }, walletService } as unknown as AppContainer;
  let session: SheetSession;

  const renderScreen = (requestUrl?: string, callerPackage?: string) => render(
    <ContainerProvider container={container}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
        <InjectSheetScreen requestUrl={requestUrl} callerPackage={callerPackage} session={session} />
      </QueryClientProvider>
    </ContainerProvider>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockNative.current = createNative();
    session = createSheetSession('sheet-1');
    isProcessed.mockReturnValue(false);
    (useWalletStatusQuery as jest.Mock).mockReturnValue({ data: WalletStatus.LOCKED });
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: undefined });
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow());
  });

  it('renders the request with account rows and password auth', async () => {
    await renderScreen('adena://request?payload=x');
    expect(flowRequest()).toEqual({ requestId: 'adena://request?payload=x' });
    expect(parseRequestUrl).toHaveBeenCalledWith('adena://request?payload=x', undefined);
    expect(flowOptions().allowCrossNetwork).toBe(true);
    expect(page()).toMatchObject({
      title: 'Confirm transaction',
      dappName: 'Example',
      origin: 'exampleapp:',
      rows: [
        { label: 'Account', value: 'Account 1' },
        { label: 'Address', value: 'g1abc', multiline: true },
        { label: 'Network', value: 'Gno.land Mainnet' },
      ],
      fee: '0.1 GNOT',
      loading: false,
      unavailable: undefined,
      auth: { mode: SheetAuthMode.PASSWORD, password: '' },
      canApprove: false,
    });

    await act(async () => page().auth?.onChangePassword('pw'));
    expect(page().canApprove).toBe(true);
  });

  it('requires a password before unlocking, then unlocks and re-locks', async () => {
    await renderScreen('adena://request?payload=x');
    await expect(flowOptions().authorize?.()).rejects.toMatchObject({ message: 'Enter your wallet password' });
    await act(async () => page().auth?.onChangePassword('secret'));
    await flowOptions().authorize?.();
    expect(walletService.unlock).toHaveBeenCalledWith('secret');
    flowOptions().release?.();
    expect(walletService.lock).toHaveBeenCalled();
  });

  it('uses biometrics when enabled', async () => {
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: { enabled: true, kind: BiometryKind.FINGERPRINT } });
    await renderScreen('adena://request?payload=x');
    expect(page().auth).toMatchObject({ mode: SheetAuthMode.BIOMETRIC, biometricLabel: expect.any(String) });
    expect(page().canApprove).toBe(true);
    await flowOptions().authorize?.();
    expect(walletService.unlockWithBiometrics).toHaveBeenCalledWith({ title: 'Confirm with biometrics', cancel: 'Cancel' });
    expect(walletService.unlock).not.toHaveBeenCalled();
  });

  it('ignores biometrics that are not enabled', async () => {
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: { enabled: false, kind: BiometryKind.FACE } });
    await renderScreen('adena://request?payload=x');
    expect(page().auth?.mode).toBe(SheetAuthMode.PASSWORD);
  });

  it('omits auth and rows for a connect request without context', async () => {
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ isTransaction: false, context: undefined, request: null }));
    await renderScreen('adena://request?payload=x');
    expect(page()).toMatchObject({ auth: undefined, rows: [], dappName: undefined, origin: undefined, canApprove: true });
  });

  it('approves, clears the password and finishes with the callback', async () => {
    const approved = flow();

    (useDappRequestFlow as jest.Mock).mockReturnValue(approved);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onChangePassword('pw'));
    await act(async () => page().onApprove());
    expect(approved.resetApproval).toHaveBeenCalled();
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://ok');
    expect(page().auth?.password).toBe('');
    expect(session.inFlight).toBe(false);
  });

  it('stays open when approval fails', async () => {
    const failing = flow({ approve: jest.fn().mockRejectedValue(new Error('wrong password')) });

    (useDappRequestFlow as jest.Mock).mockReturnValue(failing);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onChangePassword('pw'));
    await act(async () => page().onApprove());
    expect(mockNative.current?.complete).not.toHaveBeenCalled();
    expect(page().auth?.password).toBe('pw');
    expect(session.inFlight).toBe(false);
  });

  it('marks the approval in flight while signing', async () => {
    let inFlight = false;
    const signing = flow({
      approve: jest.fn(async () => {
        inFlight = session.inFlight;

        return 'cb://ok';
      }),
    });

    (useDappRequestFlow as jest.Mock).mockReturnValue(signing);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onApprove());
    expect(inFlight).toBe(true);
  });

  it('keeps the native sheet busy until the approval is answered', async () => {
    let busyWhileSigning: unknown[] = [];
    const signing = flow({
      approve: jest.fn(async () => {
        busyWhileSigning = mockNative.current?.setBusy.mock.calls.at(-1) ?? [];

        return 'cb://ok';
      }),
    });

    (useDappRequestFlow as jest.Mock).mockReturnValue(signing);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onApprove());
    expect(busyWhileSigning).toEqual(['sheet-1', true]);
    expect(mockNative.current?.setBusy).toHaveBeenLastCalledWith('sheet-1', false);
    // Busy is cleared only after complete, so back cannot close the sheet in between.
    expect(mockNative.current?.complete.mock.invocationCallOrder[0])
      .toBeLessThan(mockNative.current?.setBusy.mock.invocationCallOrder.at(-1) ?? 0);
  });

  it('clears the native busy flag when approval fails', async () => {
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ approve: jest.fn().mockRejectedValue(new Error('network')) }));
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onApprove());
    expect(mockNative.current?.setBusy.mock.calls).toEqual([['sheet-1', true], ['sheet-1', false]]);
  });

  it('ignores approve and reject taps while an approval is in flight', async () => {
    let settle: (url: string) => void = () => undefined;
    const signing = flow({
      approve: jest.fn(() => new Promise<string>((resolve) => {
        settle = resolve;
      })),
    });

    (useDappRequestFlow as jest.Mock).mockReturnValue(signing);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onChangePassword('pw'));
    const { onApprove, onReject } = page();
    let first: Promise<void> | void = undefined;

    await act(async () => {
      first = onApprove();
      await onApprove();
      onReject();
    });
    expect(signing.approve).toHaveBeenCalledTimes(1);
    expect(signing.rejectionUrl).not.toHaveBeenCalled();
    await act(async () => {
      settle('cb://ok');
      await first;
    });
    expect(mockNative.current?.complete).toHaveBeenCalledTimes(1);
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://ok');
  });

  it('shows the memo that will be signed', async () => {
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ request: { method: 'sign-and-broadcast', memo: 'signed memo', dapp: { name: 'Example' }, callbackOrigin: 'exampleapp:' } }));
    await renderScreen('adena://request?payload=x');
    expect(page().memo).toBe('signed memo');
  });

  it('rejects through the dApp callback', async () => {
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onReject());
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://reject');
  });

  it('reports a missing request and only closes', async () => {
    await renderScreen();
    expect(page().unavailable).toEqual({ title: 'Invalid request', description: 'No request was received.' });
    expect(flowRequest()).toBeNull();
    await act(async () => page().onReject());
    expect(mockNative.current?.dismiss).toHaveBeenCalledWith('sheet-1');
  });

  it('reports an unparsable request', async () => {
    parseRequestUrl.mockImplementationOnce(() => {
      throw new Error('payload is missing');
    });
    await renderScreen('adena://request');
    expect(page().unavailable).toEqual({ title: 'Invalid request', description: 'payload is missing' });
  });

  it('asks to set up a wallet first and withholds the request', async () => {
    (useWalletStatusQuery as jest.Mock).mockReturnValue({ data: WalletStatus.EMPTY });
    await renderScreen('adena://request?payload=x');
    expect(page().unavailable?.title).toBe('Set up Adena first');
    expect(flowRequest()).toBeNull();
  });

  it('shows loading until the wallet status is known', async () => {
    (useWalletStatusQuery as jest.Mock).mockReturnValue({ data: undefined });
    await renderScreen('adena://request?payload=x');
    expect(page().loading).toBe(true);
  });
  it('passes the Android caller package to the parser and the page', async () => {
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ request: { dapp: { name: 'Example' }, callbackOrigin: 'exampleapp:', callerPackage: 'com.example.app' } }));
    await renderScreen('adena://request?payload=x', 'com.example.app');
    expect(parseRequestUrl).toHaveBeenCalledWith('adena://request?payload=x', 'com.example.app');
    expect(page()).toMatchObject({ origin: 'exampleapp:', callerPackage: 'com.example.app' });
  });

  it('requires authentication for a connect request too', async () => {
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ isTransaction: false, title: 'Connect app', approveLabel: 'Connect' }));
    await renderScreen('adena://request?payload=x');
    expect(page()).toMatchObject({ auth: { mode: SheetAuthMode.PASSWORD }, canApprove: false });
    await expect(flowOptions().authorize?.()).rejects.toMatchObject({ message: 'Enter your wallet password' });
  });

  it('offers the password instead of biometrics and back', async () => {
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: { enabled: true, kind: BiometryKind.FINGERPRINT } });
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onUsePassword?.());
    expect(page().auth).toMatchObject({ mode: SheetAuthMode.PASSWORD, onUsePassword: undefined });
    expect(page().canApprove).toBe(false);
    await act(async () => page().auth?.onChangePassword('pw'));
    await flowOptions().authorize?.();
    expect(walletService.unlock).toHaveBeenCalledWith('pw');
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();
    await act(async () => page().auth?.onUseBiometrics?.());
    expect(page().auth?.mode).toBe(SheetAuthMode.BIOMETRIC);
  });

  it('switches to the password when biometrics are locked out or invalidated', async () => {
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: { enabled: true, kind: BiometryKind.FINGERPRINT } });
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ approve: jest.fn().mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'locked out')) }));
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onApprove());
    expect(page().auth?.mode).toBe(SheetAuthMode.PASSWORD);
    expect(mockNative.current?.complete).not.toHaveBeenCalled();
  });

  it.each([
    ['a canceled prompt', new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'canceled'), undefined],
    ['a stale escrowed password', new AppError(AppErrorCode.INVALID_PASSWORD, 'stale'), 'Biometric password is out of date. Enter your password.'],
    ['a lockout', new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'locked out'), 'Fingerprint is unavailable. Enter your password.'],
    ['a changed enrollment', new AppError(AppErrorCode.BIOMETRICS_INVALIDATED, BIOMETRICS_INVALIDATED_MESSAGE), BIOMETRICS_INVALIDATED_MESSAGE],
  ])('falls back to the password field after %s, like every wallet password prompt', async (_name, error, message) => {
    const { Platform } = jest.requireActual('react-native');
    const original = Platform.OS;

    Platform.OS = 'android';
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: { enabled: true, kind: BiometryKind.FINGERPRINT } });
    const failing = flow({ approve: jest.fn().mockRejectedValue(error) });

    (useDappRequestFlow as jest.Mock).mockReturnValue(failing);

    try {
      await renderScreen('adena://request?payload=x');
      await act(async () => page().onApprove());
      expect(page().auth).toMatchObject({ mode: SheetAuthMode.PASSWORD, passwordError: message });
      expect(page().auth?.passwordRef).toBeDefined();
      // The raw biometric error does not show as a failed request.
      expect(failing.resetApproval).toHaveBeenCalledTimes(2);
      expect(page().auth?.onUseBiometrics).toBeDefined();

      await act(async () => page().auth?.onChangePassword('typed'));
      expect(page().auth?.passwordError).toBeUndefined();
    }
    finally {
      Platform.OS = original;
    }
  });

  it('refreshes the biometric status after a changed enrollment', async () => {
    const invalidate = jest.spyOn(QueryClient.prototype, 'invalidateQueries');

    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: { enabled: true, kind: BiometryKind.FINGERPRINT } });
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ approve: jest.fn().mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_INVALIDATED)) }));
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onApprove());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.biometric() });
    invalidate.mockRestore();
  });

  it('locks into a done state after success so nothing is approved or answered twice', async () => {
    const approved = flow();

    (useDappRequestFlow as jest.Mock).mockReturnValue(approved);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onChangePassword('pw'));
    await act(async () => page().onApprove());
    expect(page()).toMatchObject({ unavailable: { title: 'Response sent' }, canApprove: false });
    expect(flowRequest()).toBeNull();
    await act(async () => page().onApprove());
    await act(async () => page().onReject());
    expect(approved.approve).toHaveBeenCalledTimes(1);
    expect(approved.rejectionUrl).not.toHaveBeenCalled();
    expect(mockNative.current?.complete).toHaveBeenCalledTimes(1);
    expect(mockNative.current?.dismiss).toHaveBeenCalledWith('sheet-1');
  });

  it('keeps approval state per sheet session', async () => {
    const other = createSheetSession('sheet-2');

    other.inFlight = true;
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onChangePassword('pw'));
    await act(async () => page().onApprove());
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://ok');
    expect(other).toMatchObject({ inFlight: true, done: false });
  });

  it('answers an already handled request with a duplicate error', async () => {
    isProcessed.mockReturnValue(true);
    await renderScreen('adena://request?payload=x');
    expect(flowRequest()).toBeNull();
    expect(page().unavailable?.title).toBe('Request already handled');
    expect(reconcile).toHaveBeenCalledWith({ requestId: 'adena://request?payload=x' });
    await act(async () => page().onReject());
    expect(answerDuplicate).toHaveBeenCalledWith({ requestId: 'adena://request?payload=x' });
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://duplicate');
  });

  it('rejects through the dApp callback on back press', async () => {
    await renderScreen('adena://request?payload=x');
    await act(async () => session.onDismissRequest?.());
    expect(mockNative.current?.complete).toHaveBeenCalledWith('sheet-1', 'cb://reject');
    expect(session.done).toBe(true);
  });
});
