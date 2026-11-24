import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { InjectSheetPage, InjectSheetPageProps, SheetAuthMode } from '../../../src/components/pages';
import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { DappRequestFlowOptions, useDappRequestFlow } from '../../../src/hooks/use-dapp-request-flow';
import { finishSheet, InjectSheetScreen, sheetApproval } from '../../../src/inject-sheet/inject-sheet-screen';
import { useBiometricStatusQuery, useWalletStatusQuery } from '../../../src/queries/wallet.queries';
import { BiometryKind } from '../../../src/security/secure-store';
import { WalletStatus } from '../../../src/services/wallet.service';

const mockNative = { current: { complete: jest.fn(), dismiss: jest.fn() } as { complete: jest.Mock; dismiss: jest.Mock } | null };

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
    mockNative.current = { complete: jest.fn(), dismiss: jest.fn() };
  });

  it('completes natively with a callback url', () => {
    finishSheet('cb://x');
    expect(mockNative.current?.complete).toHaveBeenCalledWith('cb://x');
  });

  it('dismisses natively without a callback url', () => {
    finishSheet(null);
    expect(mockNative.current?.dismiss).toHaveBeenCalled();
  });

  it('opens the callback url without the native module and ignores failures', async () => {
    mockNative.current = null;
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));

    finishSheet('cb://x');
    finishSheet(null);
    await act(async () => undefined);
    expect(openURL).toHaveBeenCalledTimes(1);
    openURL.mockRestore();
  });
});

describe('InjectSheetScreen', () => {
  const parseRequestUrl = jest.fn((url: string) => ({ requestId: url }));
  const walletService = { unlock: jest.fn(), unlockWithBiometrics: jest.fn(), lock: jest.fn() };
  const container = { dappService: { parseRequestUrl }, walletService } as unknown as AppContainer;

  const renderScreen = (requestUrl?: string) => render(
    <ContainerProvider container={container}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
        <InjectSheetScreen requestUrl={requestUrl} />
      </QueryClientProvider>
    </ContainerProvider>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockNative.current = { complete: jest.fn(), dismiss: jest.fn() };
    sheetApproval.inFlight = false;
    (useWalletStatusQuery as jest.Mock).mockReturnValue({ data: WalletStatus.LOCKED });
    (useBiometricStatusQuery as jest.Mock).mockReturnValue({ data: undefined });
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow());
  });

  it('renders the request with account rows and password auth', async () => {
    await renderScreen('adena://request?payload=x');
    expect(flowRequest()).toEqual({ requestId: 'adena://request?payload=x' });
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
    expect(mockNative.current?.complete).toHaveBeenCalledWith('cb://ok');
    expect(page().auth?.password).toBe('');
    expect(sheetApproval.inFlight).toBe(false);
  });

  it('stays open when approval fails', async () => {
    const failing = flow({ approve: jest.fn().mockRejectedValue(new Error('wrong password')) });

    (useDappRequestFlow as jest.Mock).mockReturnValue(failing);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().auth?.onChangePassword('pw'));
    await act(async () => page().onApprove());
    expect(mockNative.current?.complete).not.toHaveBeenCalled();
    expect(page().auth?.password).toBe('pw');
    expect(sheetApproval.inFlight).toBe(false);
  });

  it('marks the approval in flight while signing', async () => {
    let inFlight = false;
    const signing = flow({
      approve: jest.fn(async () => {
        inFlight = sheetApproval.inFlight;

        return 'cb://ok';
      }),
    });

    (useDappRequestFlow as jest.Mock).mockReturnValue(signing);
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onApprove());
    expect(inFlight).toBe(true);
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
    expect(mockNative.current?.complete).toHaveBeenCalledWith('cb://ok');
  });

  it('shows the memo that will be signed', async () => {
    (useDappRequestFlow as jest.Mock).mockReturnValue(flow({ request: { method: 'sign-and-broadcast', memo: 'signed memo', dapp: { name: 'Example' }, callbackOrigin: 'exampleapp:' } }));
    await renderScreen('adena://request?payload=x');
    expect(page().memo).toBe('signed memo');
  });

  it('rejects through the dApp callback', async () => {
    await renderScreen('adena://request?payload=x');
    await act(async () => page().onReject());
    expect(mockNative.current?.complete).toHaveBeenCalledWith('cb://reject');
  });

  it('reports a missing request and only closes', async () => {
    await renderScreen();
    expect(page().unavailable).toEqual({ title: 'Invalid request', description: 'No request was received.' });
    expect(flowRequest()).toBeNull();
    await act(async () => page().onReject());
    expect(mockNative.current?.dismiss).toHaveBeenCalled();
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
});
