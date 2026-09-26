import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';

import LandingScreen from './index';

const mockNavigate = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (): { data: boolean; isLoading: boolean } => ({ data: false, isLoading: false }),
}));

jest.mock('@hooks/use-context', () => ({
  useAdenaContext: (): { walletService: { id: string } } => ({ walletService: { id: 'test-wallet' } }),
}));

jest.mock('@hooks/use-app-navigate', () => ({
  __esModule: true,
  default: (): { navigate: jest.Mock } => ({ navigate: mockNavigate }),
}));

jest.mock('@components/atoms/lottie', () => ({
  __esModule: true,
  default: (): React.ReactElement => <div data-testid='lottie' />,
}));

const renderScreen = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <LandingScreen />
    </ThemeProvider>,
  );
};

const hardwareWalletButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /Hardware Wallets/ }) as HTMLButtonElement;

const standardWalletButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /Standard Wallets/ }) as HTMLButtonElement;

const advancedSetupButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /Advanced Setup/ }) as HTMLButtonElement;

describe('LandingScreen hardware wallet entry', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    delete (globalThis as unknown as { browser?: unknown }).browser;
  });

  it('disables the hardware wallet entry in Firefox and states the reason', () => {
    (globalThis as unknown as { browser: unknown }).browser = {};

    renderScreen();

    const button = hardwareWalletButton();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain(
      'Hardware wallets like Ledger are not supported in Firefox.',
    );

    fireEvent.click(button);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the hardware wallet entry usable outside Firefox', () => {
    renderScreen();

    const button = hardwareWalletButton();
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain(
      'Connect your accounts from hardware wallets like Ledger.',
    );

    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/web/select-hard-wallet');
  });

  it('leaves the other entries untouched in Firefox', () => {
    (globalThis as unknown as { browser: unknown }).browser = {};

    renderScreen();

    expect(hardwareWalletButton().disabled).toBe(true);
    expect(standardWalletButton().disabled).toBe(false);
    expect(advancedSetupButton().disabled).toBe(false);
  });
});
