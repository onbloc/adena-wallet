import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';
import {installMobilePlatform} from '../src/platform/install';

jest.mock('../src/platform/install', () => ({
  installMobilePlatform: jest.fn(),
}));

const mockedInstall = installMobilePlatform as jest.MockedFunction<
  typeof installMobilePlatform
>;

const renderStatus = async (): Promise<string> => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  return renderer.root.findByProps({testID: 'platform-status'}).props.children;
};

describe('App shell', () => {
  it('reports a ready platform', async () => {
    mockedInstall.mockResolvedValue({
      ok: true,
      platform: {hardwareBackedStorage: true} as any,
    });
    expect(await renderStatus()).toBe('Platform ready.');
  });

  it('warns when the storage key is not hardware-backed', async () => {
    mockedInstall.mockResolvedValue({
      ok: true,
      platform: {hardwareBackedStorage: false} as any,
    });
    expect(await renderStatus()).toContain('not hardware-backed');
  });

  it('disables wallet features when the crypto self-test fails', async () => {
    mockedInstall.mockResolvedValue({
      ok: false,
      reason: 'crypto',
      error: new Error('x'),
    });
    expect(await renderStatus()).toContain('Wallet features are disabled');
  });
});
