import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';
import {installMobilePlatform} from '../src/platform/install';

jest.mock('../src/platform/install', () => ({
  installMobilePlatform: jest.fn(),
}));
// The wallet UI itself is covered elsewhere; here only the boot gate matters.
jest.mock('../src/core/wallet-context', () => ({
  WalletProvider: ({children}: any) => children,
}));
jest.mock('../src/security/reauth', () => ({
  ReauthProvider: ({children}: any) => children,
}));
jest.mock('../src/navigation/RootNavigator', () => {
  const {Text} = require('react-native');
  return {RootNavigator: () => <Text testID="wallet-ui">wallet</Text>};
});

const mockedInstall = installMobilePlatform as jest.MockedFunction<
  typeof installMobilePlatform
>;

const render = async (): Promise<ReactTestRenderer.ReactTestRenderer> => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  return renderer;
};

describe('App shell', () => {
  it('shows the wallet UI once the platform is ready', async () => {
    mockedInstall.mockResolvedValue({
      ok: true,
      platform: {autoLock: {reset: jest.fn()}} as any,
    });
    const renderer = await render();
    expect(
      renderer.root.findAllByProps({testID: 'wallet-ui'}).length,
    ).toBeGreaterThan(0);
  });

  it('disables wallet features when the crypto self-test fails', async () => {
    mockedInstall.mockResolvedValue({
      ok: false,
      reason: 'crypto',
      error: new Error('x'),
    });
    const renderer = await render();
    const status = renderer.root.findByProps({testID: 'platform-status'}).props
      .children;
    expect(status).toContain('Wallet features are disabled');
  });
});
