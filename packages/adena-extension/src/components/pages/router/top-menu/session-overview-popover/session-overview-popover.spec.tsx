import React from 'react';
import { fireEvent, render, RenderResult, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';
import { SessionOverviewPopover } from './session-overview-popover';

const renderPopover = (
  overrides: Partial<React.ComponentProps<typeof SessionOverviewPopover>> = {},
): RenderResult => {
  const props: React.ComponentProps<typeof SessionOverviewPopover> = {
    open: true,
    positionY: 50,
    caretRight: 30,
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    masterAddress: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    expiresAt: 1_900_000_000,
    allowPaths: [],
    spendLimitUgnot: undefined,
    spendPeriod: undefined,
    spendUsedUgnot: undefined,
    spendReset: undefined,
    onOpenAccount: vi.fn(),
    onOpenRealm: vi.fn(),
    ...overrides,
  };

  return render(
    <JotaiProvider>
      <ThemeProvider theme={theme}>
        <div id='portal-popup' />
        <SessionOverviewPopover {...props} />
      </ThemeProvider>
    </JotaiProvider>,
  );
};

describe('SessionOverviewPopover', () => {
  it('renders Session Overview title with the master row when open', () => {
    renderPopover();

    expect(screen.getByText('Session Overview')).toBeTruthy();
    expect(screen.getByText('Master Account')).toBeTruthy();
  });

  it('renders nothing when open is false', () => {
    renderPopover({ open: false });

    expect(screen.queryByText('Session Overview')).toBeNull();
  });

  it('passes spend period through to the detail card', () => {
    renderPopover({
      spendLimitUgnot: '1000000ugnot',
      spendPeriod: 86_400,
    });

    expect(screen.getByText('Every 1 day')).toBeTruthy();
  });

  describe('revoked', () => {
    it('replaces the overview with the revoked guidance', () => {
      renderPopover({ revoked: true, spendLimitUgnot: '1000000ugnot', spendPeriod: 86_400 });

      expect(screen.getByText('REVOKED')).toBeTruthy();
      expect(screen.queryByText('Session Overview')).toBeNull();
      expect(screen.queryByText('Every 1 day')).toBeNull();
    });

    it('invokes the recovery handlers', () => {
      const onRemoveAccount = vi.fn();
      const onExportKey = vi.fn();
      renderPopover({ revoked: true, onRemoveAccount, onExportKey });

      fireEvent.click(screen.getByText('remove this account'));
      fireEvent.click(screen.getByText('export your key'));

      expect(onRemoveAccount).toHaveBeenCalledTimes(1);
      expect(onExportKey).toHaveBeenCalledTimes(1);
    });
  });
});
