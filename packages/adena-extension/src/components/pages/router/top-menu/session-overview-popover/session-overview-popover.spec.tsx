import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';
import { SessionOverviewPopover } from './session-overview-popover';

const renderPopover = (overrides: Partial<React.ComponentProps<typeof SessionOverviewPopover>> = {}) => {
  const props: React.ComponentProps<typeof SessionOverviewPopover> = {
    open: true,
    positionY: 50,
    caretRight: 30,
    onMouseEnter: jest.fn(),
    onMouseLeave: jest.fn(),
    masterAddress: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    expiresAt: 1_900_000_000,
    allowPaths: [],
    spendLimitUgnot: undefined,
    spendPeriod: undefined,
    spendUsedUgnot: undefined,
    spendReset: undefined,
    onOpenAccount: jest.fn(),
    onOpenRealm: jest.fn(),
    ...overrides,
  };

  return render(
    <RecoilRoot>
      <ThemeProvider theme={theme}>
        <div id='portal-popup' />
        <SessionOverviewPopover {...props} />
      </ThemeProvider>
    </RecoilRoot>,
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
});
