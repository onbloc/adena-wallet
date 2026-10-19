import React from 'react';
import {Modal, View} from 'react-native';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {ReauthHost, ReauthProvider, useReauth} from '../../src/security/reauth';

const mockState = {biometricEnabled: false, escrowMatches: false};

jest.mock('../../src/core/wallet-context', () => ({
  useWallet: () => ({
    base: {
      walletService: {equalsPassword: async () => mockState.escrowMatches},
    },
    verifyPassword: async (password: string) =>
      password === 'right' ? {ok: true} : {ok: false, waitMs: 0},
    biometricEnabled: mockState.biometricEnabled,
  }),
}));
jest.mock('../../src/platform/biometric-unlock', () => ({
  unlockWithBiometrics: async () => 'escrowed-password',
}));

afterEach(() => {
  mockState.biometricEnabled = false;
  mockState.escrowMatches = false;
});

let requestReauth: ReturnType<typeof useReauth>;
function Probe() {
  requestReauth = useReauth();
  return null;
}

const render = (children: React.ReactNode) => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ReauthProvider>
        <Probe />
        {children}
      </ReauthProvider>,
    );
  });
  return renderer.root;
};

const visibleModals = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findAllByType(Modal).filter(modal => modal.props.visible);

describe('ReauthProvider', () => {
  it('closes the prompt and resolves false when the request is aborted', async () => {
    const root = render(null);
    const controller = new AbortController();
    let result: Promise<boolean>;
    await act(async () => {
      result = requestReauth('Sign', controller.signal);
    });
    expect(visibleModals(root)).toHaveLength(1);

    await act(async () => {
      controller.abort();
    });
    await expect(result!).resolves.toBe(false);
    expect(visibleModals(root)).toHaveLength(0);
  });

  it('does not prompt for an already aborted request', async () => {
    const root = render(null);
    const controller = new AbortController();
    controller.abort();
    let result: Promise<boolean>;
    await act(async () => {
      result = requestReauth('Sign', controller.signal);
    });
    await expect(result!).resolves.toBe(false);
    expect(visibleModals(root)).toHaveLength(0);
  });

  it('shows the prompt inside a nested host instead of at the root', async () => {
    const root = render(
      <View testID="approval-sheet">
        <ReauthHost />
      </View>,
    );
    await act(async () => {
      requestReauth('Sign');
    });
    const shown = visibleModals(root);
    expect(shown).toHaveLength(1);
    const sheet = root.findByProps({testID: 'approval-sheet'});
    expect(sheet.findAllByType(Modal)).toContain(shown[0]);
  });

  it("passes with biometrics only when the escrowed password is this wallet's", async () => {
    mockState.biometricEnabled = true;
    mockState.escrowMatches = true;
    const root = render(null);
    let result: Promise<boolean>;
    await act(async () => {
      result = requestReauth('Sign');
    });
    await expect(result!).resolves.toBe(true);
    expect(visibleModals(root)).toHaveLength(0);
  });

  it('asks for the password when the escrow is stale', async () => {
    mockState.biometricEnabled = true;
    const root = render(null);
    await act(async () => {
      requestReauth('Sign');
    });
    expect(visibleModals(root)).toHaveLength(1);
  });
});
