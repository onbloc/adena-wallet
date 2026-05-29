import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';
import { SessionDetailCard } from './session-detail-card';

const NOW_SEC = 1_716_000_000;

const renderCard = (
  overrides: Partial<React.ComponentProps<typeof SessionDetailCard>> = {},
): ReturnType<typeof render> & {
  props: React.ComponentProps<typeof SessionDetailCard>;
} => {
  const props: React.ComponentProps<typeof SessionDetailCard> = {
    showMasterRow: false,
    masterAddress: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    expiresAt: NOW_SEC + 86_400 * 5,
    allowPaths: [],
    spendLimitUgnot: undefined,
    spendPeriod: undefined,
    spendUsedUgnot: undefined,
    spendReset: undefined,
    onOpenAccount: jest.fn(),
    onOpenRealm: jest.fn(),
    ...overrides,
  };

  const utils = render(
    <RecoilRoot>
      <ThemeProvider theme={theme}>
        <SessionDetailCard {...props} />
      </ThemeProvider>
    </RecoilRoot>,
  );
  return { ...utils, props };
};

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW_SEC * 1000);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('SessionDetailCard', () => {
  it('hides Master Account row by default', () => {
    renderCard();

    expect(screen.queryByText('Master Account')).toBeNull();
  });

  it('shows Master Account row when showMasterRow=true', () => {
    renderCard({ showMasterRow: true });

    expect(screen.getByText('Master Account')).toBeTruthy();
    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
  });

  it('calls onOpenAccount when master account share is clicked', () => {
    const onOpenAccount = jest.fn();
    renderCard({ showMasterRow: true, onOpenAccount });

    fireEvent.click(screen.getByLabelText('Open master account on gnoscan'));
    expect(onOpenAccount).toHaveBeenCalledWith('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');
  });

  it('renders Nd chip with Math.floor days remaining', () => {
    renderCard({ expiresAt: NOW_SEC + 86_400 * 7 + 3600 });

    expect(screen.getByText('7d')).toBeTruthy();
  });

  it('renders <1d chip when remaining is less than a day', () => {
    renderCard({ expiresAt: NOW_SEC + 3600 });

    expect(screen.getByText('<1d')).toBeTruthy();
  });

  it('renders EXPIRED chip when expiresAt is in the past', () => {
    renderCard({ expiresAt: NOW_SEC - 60 });

    expect(screen.getByText('EXPIRED')).toBeTruthy();
  });

  it('shows Does not expire and hides the chip when expiresAt is 0', () => {
    renderCard({ expiresAt: 0 });

    expect(screen.getByText('Does not expire')).toBeTruthy();
    expect(screen.queryByText(/EXPIRED|<1d|\dd/)).toBeNull();
  });

  it('renders No allow paths when allowPaths is empty', () => {
    renderCard({ allowPaths: [] });

    expect(screen.getByText('No allow paths')).toBeTruthy();
  });

  it('renders wildcard allow path as no restrictions without a link', () => {
    renderCard({ allowPaths: ['*', 'vm/exec:gno.land/r/demo/foo'] });

    expect(screen.getByText('No restrictions')).toBeTruthy();
    expect(screen.getByText('gno.land/r/demo/foo')).toBeTruthy();
    expect(screen.queryByText('*')).toBeNull();
    expect(screen.queryByText('vm/exec:gno.land/r/demo/foo')).toBeNull();
  });

  it('renders route/type allow paths without realm links', () => {
    renderCard({ allowPaths: ['vm/exec', 'vm/run', 'bank/send', 'bank/multisend'] });

    expect(screen.getByText('vm/exec')).toBeTruthy();
    expect(screen.getByText('vm/run')).toBeTruthy();
    expect(screen.getByText('bank/send')).toBeTruthy();
    expect(screen.getByText('bank/multisend')).toBeTruthy();
    expect(screen.queryByLabelText(/Open .* on gnoscan/)).toBeNull();
  });

  it('renders allow paths and calls onOpenRealm for vm/exec realm path links', () => {
    const onOpenRealm = jest.fn();
    renderCard({
      allowPaths: ['vm/exec:gno.land/r/demo/foo', 'vm/exec:gno.land/r/demo/bar'],
      onOpenRealm,
    });

    expect(screen.getByText('gno.land/r/demo/foo')).toBeTruthy();
    expect(screen.getByText('gno.land/r/demo/bar')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Open gno.land/r/demo/foo on gnoscan'));
    expect(onOpenRealm).toHaveBeenCalledWith('gno.land/r/demo/foo');
  });

  it('renders 100% USED danger chip when spendUsed equals spendLimit', () => {
    renderCard({
      spendLimitUgnot: '1000000ugnot',
      spendUsedUgnot: '1000000ugnot',
    });

    expect(screen.getByText('100% USED')).toBeTruthy();
  });

  it('hides Spend Limit row when spendLimit is missing or zero', () => {
    renderCard({ spendLimitUgnot: undefined });

    expect(screen.queryByText('Spend Limit')).toBeNull();
  });

  it('shows No reset scheduled when spend period is missing but spend limit exists', () => {
    renderCard({
      spendLimitUgnot: '1000000ugnot',
      spendPeriod: undefined,
      spendReset: undefined,
    });

    expect(screen.getByText('Spend Period')).toBeTruthy();
    expect(screen.getByText('No reset scheduled')).toBeTruthy();
  });

  it('shows the configured spend period when reset is not scheduled yet', () => {
    renderCard({
      spendLimitUgnot: '1000000ugnot',
      spendPeriod: 86_400,
      spendReset: undefined,
    });

    expect(screen.getByText('Every 1 day')).toBeTruthy();
  });

  it('hides Spend Period row when spend limit is missing', () => {
    renderCard({ spendLimitUgnot: undefined, spendReset: NOW_SEC + 3600 });

    expect(screen.queryByText('Spend Period')).toBeNull();
  });

  it('shows Next reset countdown from spendReset plus spendPeriod', () => {
    renderCard({
      spendLimitUgnot: '1000000ugnot',
      spendPeriod: 3600,
      spendReset: NOW_SEC - 1800,
    });

    expect(screen.getByText('Next reset in 00:30:00')).toBeTruthy();
  });
});
