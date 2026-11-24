import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '../src/components/atoms';
import { applyKeypadKey } from '../src/components/molecules';
import { WalletHomePage, WalletHomePageProps } from '../src/components/pages';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('Button', () => {
  it('fires onPress and blocks presses while loading', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label='Continue' onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button label='Continue' onPress={onPress} loading loadingLabel='Submitting…' />);
    expect(screen.getByText('Submitting…')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('applyKeypadKey', () => {
  it('keeps one decimal point and the token precision', () => {
    expect(applyKeypadKey('', '.', 6)).toBe('0.');
    expect(applyKeypadKey('1.5', '.', 6)).toBe('1.5');
    expect(applyKeypadKey('0', '7', 6)).toBe('7');
    expect(applyKeypadKey('1.123456', '7', 6)).toBe('1.123456');
    expect(applyKeypadKey('12', 'backspace', 6)).toBe('1');
  });
});

describe('WalletHomePage', () => {
  const props = (overrides: Partial<WalletHomePageProps> = {}): WalletHomePageProps => ({
    accountName: 'Adena wallet',
    address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    networkName: 'Mainnet',
    isTestnet: false,
    headline: '$1,234.50',
    headlineCaption: '+$12.00 (+0.98%) today',
    headlineLoading: false,
    assets: [{ key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', quantity: '1,234.5 GNOT', value: '$1,234.50', trend: 'neutral', loading: false }],
    collections: [],
    nftSupported: true,
    nftLoading: false,
    tab: 'tokens',
    refreshing: false,
    onRefresh: jest.fn(),
    onTabChange: jest.fn(),
    onCopyAddress: jest.fn(),
    onOpenAccounts: jest.fn(),
    onOpenSettings: jest.fn(),
    onScan: jest.fn(),
    onOpenToken: jest.fn(),
    onOpenCollection: jest.fn(),
    onManageTokens: jest.fn(),
    onManageNfts: jest.fn(),
    onBuy: jest.fn(),
    onSend: jest.fn(),
    onReceive: jest.fn(),
    ...overrides,
  });

  it('renders data from props and reports actions through callbacks', async () => {
    const page = props();

    await render(<SafeAreaProvider initialMetrics={metrics}><WalletHomePage {...page} /></SafeAreaProvider>);

    expect(screen.getAllByText('$1,234.50').length).toBeGreaterThan(0);
    expect(screen.getByText('1,234.5 GNOT')).toBeTruthy();
    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    expect(page.onSend).toHaveBeenCalled();
    expect(page.onCopyAddress).toHaveBeenCalled();
  });
});
