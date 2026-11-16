import type { Mock } from 'vitest';
// Stub out `@adena-wallet/sdk` to avoid loading @web3auth's native crypto,
// which fails under jsdom's Uint8Array.
vi.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    NO_ACCOUNT: 'NO_ACCOUNT',
    UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  },
  WalletMessageInfo: {
    NO_ACCOUNT: { code: 3002, status: 'failure', type: 'NO_ACCOUNT', message: '' },
    UNEXPECTED_ERROR: { code: 9000, status: 'failure', type: 'UNEXPECTED_ERROR', message: '' },
  },
}));

vi.mock('adena-module', () => ({
  isAirgapAccount: (): boolean => false,
}));

const mockNavigate = vi.fn();
let mockSearch = '';
vi.mock('react-router-dom', () => ({
  useNavigate: (): Mock => mockNavigate,
  useLocation: (): { search: string } => ({ search: mockSearch }),
}));

let mockState = 'LOGIN';
vi.mock('@hooks/use-load-accounts', () => ({
  useLoadAccounts: (): { state: string; loadAccounts: Mock } => ({
    state: mockState,
    loadAccounts: vi.fn(),
  }),
}));

vi.mock('@hooks/use-context', () => ({
  useAdenaContext: (): { walletService: object } => ({ walletService: {} }),
  useWalletContext: (): { initWallet: Mock } => ({ initWallet: vi.fn() }),
}));

vi.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: (): { currentAccount: object } => ({ currentAccount: {} }),
}));

// Keep the real module: `@states` builds atoms at import time.
vi.mock('jotai', async () => ({
  ...(await vi.importActual<typeof import('jotai')>('jotai')),
  useAtom: (): [undefined, Mock] => [undefined, vi.fn()],
}));

// The FINISH branch renders this; its contents are irrelevant to routing.
vi.mock('./loading-approve-transaction', () => ({ default: (): null => null }));

import { render } from '@testing-library/react';
import React from 'react';
import type { JSX } from 'react';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';

import { encodeParameter } from '@common/utils/client-utils';
import { RoutePath } from '@types';

import { ApproveLogin } from '.';

function searchFor(type: string): string {
  const data = encodeParameter({ type, key: 'request-key', data: { signer: 'g1', data: 'hi' } });
  return `?key=request-key&hostname=example.com&protocol=https:&data=${data}`;
}

// The request arrives while the wallet is locked, so the page renders first and
// only routes once unlocking flips the state to FINISH. Driving it in that
// order matters: redirect() reads requestData, which the first render sets.
function renderThenUnlock(type: string): void {
  mockSearch = searchFor(type);
  mockState = 'LOGIN';
  // A fresh element each time: React bails out of an update when the element
  // is referentially identical to the previous one.
  const ui = (): JSX.Element => (
    <ThemeProvider theme={theme}>
      <ApproveLogin />
    </ThemeProvider>
  );
  const { rerender } = render(ui());
  mockState = 'FINISH';
  rerender(ui());
}

describe('ApproveLogin redirect', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // Without this case the request reaches `default`, which answers with no key.
  // `popupMessageListener` drops keyless messages, so the popup would sit on the
  // login screen and the dApp would hear nothing until the window was closed.
  it('routes a SIGN_ARBITRARY request to the signing screen after unlock', () => {
    renderThenUnlock('SIGN_ARBITRARY');

    expect(mockNavigate).toHaveBeenCalledWith(
      RoutePath.ApproveSignArbitrary + mockSearch,
      expect.objectContaining({ state: expect.anything() }),
    );
  });

  it.each([
    ['SIGN_AMINO', RoutePath.ApproveSign],
    ['SIGN_TX', RoutePath.ApproveSignTransaction],
    ['DO_CONTRACT', RoutePath.ApproveTransaction],
  ])('still routes %s to its own screen', (type, expected) => {
    renderThenUnlock(type);

    expect(mockNavigate).toHaveBeenCalledWith(expected + mockSearch, expect.anything());
  });
});
