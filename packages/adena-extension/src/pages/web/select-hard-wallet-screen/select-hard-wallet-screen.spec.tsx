import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';

import SelectHardWalletScreen from './index';

const mockNavigate = jest.fn();

jest.mock('@hooks/use-app-navigate', () => ({
  __esModule: true,
  default: (): { navigate: jest.Mock } => ({ navigate: mockNavigate }),
}));

const renderScreen = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <SelectHardWalletScreen />
    </ThemeProvider>,
  );
};

const ledgerButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /Continue with Ledger/ }) as HTMLButtonElement;

describe('SelectHardWalletScreen Ledger entry', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    delete (globalThis as unknown as { browser?: unknown }).browser;
  });

  it('disables the Ledger entry in Firefox and states the reason', () => {
    (globalThis as unknown as { browser: unknown }).browser = {};

    renderScreen();

    const button = ledgerButton();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Ledger is not supported in Firefox.');

    fireEvent.click(button);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the Ledger entry usable in Chrome, with no reason shown', () => {
    renderScreen();

    const button = ledgerButton();
    expect(button.disabled).toBe(false);
    expect(button.textContent).not.toContain('not supported');

    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/web/connect-ledger');
  });

  it('does not depend on WebHID/WebUSB being probeable in Chrome', () => {
    // The gate is the browser, not `navigator.hid` / `navigator.usb`: a probe
    // that comes back empty must never take the entry away from a Chrome user.
    const navigatorWithout = navigator as Navigator & { hid?: unknown; usb?: unknown };
    expect(navigatorWithout.hid).toBeUndefined();
    expect(navigatorWithout.usb).toBeUndefined();

    renderScreen();

    expect(ledgerButton().disabled).toBe(false);
  });
});
