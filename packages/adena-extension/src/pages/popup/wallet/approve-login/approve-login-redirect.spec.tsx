// Stub out `@adena-wallet/sdk` to avoid loading @web3auth's native crypto,
// which fails under jsdom's Uint8Array.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    NO_ACCOUNT: 'NO_ACCOUNT',
    UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  },
  WalletMessageInfo: {
    NO_ACCOUNT: { code: 3002, status: 'failure', type: 'NO_ACCOUNT', message: '' },
    UNEXPECTED_ERROR: { code: 9000, status: 'failure', type: 'UNEXPECTED_ERROR', message: '' },
  },
}));

jest.mock('adena-module', () => ({
  isAirgapAccount: (): boolean => false,
}));

const mockNavigate = jest.fn();
let mockSearch = '';
jest.mock('react-router-dom', () => ({
  useNavigate: (): jest.Mock => mockNavigate,
  useLocation: (): { search: string } => ({ search: mockSearch }),
}));

let mockState = 'LOGIN';
jest.mock('@hooks/use-load-accounts', () => ({
  useLoadAccounts: (): { state: string; loadAccounts: jest.Mock } => ({
    state: mockState,
    loadAccounts: jest.fn(),
  }),
}));

jest.mock('@hooks/use-context', () => ({
  useAdenaContext: (): { walletService: object } => ({ walletService: {} }),
  useWalletContext: (): { initWallet: jest.Mock } => ({ initWallet: jest.fn() }),
}));

jest.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: (): { currentAccount: object } => ({ currentAccount: {} }),
}));

// Keep the real module: `@states` builds atoms at import time.
jest.mock('recoil', () => ({
  ...jest.requireActual('recoil'),
  useRecoilState: (): [undefined, jest.Mock] => [undefined, jest.fn()],
}));

// The FINISH branch renders this; its contents are irrelevant to routing.
jest.mock('./loading-approve-transaction', () => (): null => null);

import { render } from '@testing-library/react';
import React from 'react';
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
