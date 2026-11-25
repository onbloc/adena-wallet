import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { DappRequestPage, DappRequestPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const props = (overrides: Partial<DappRequestPageProps> = {}): DappRequestPageProps => ({
  title: 'Approve transaction',
  dappName: 'Gnoswap',
  origin: 'https://gnoswap.io',
  networkName: 'Mainnet',
  accountName: 'Account 1',
  address,
  messages: [
    { title: 'Call', details: [{ label: 'Function', value: 'Swap' }, { label: 'Package', value: 'gno.land/r/gnoswap/v1/router' }] },
    { title: 'Call', details: [{ label: 'Function', value: 'Approve' }] },
    { title: 'Send', details: [{ label: 'Amount', value: '1 GNOT' }] },
  ],
  fee: '0.001 GNOT',
  memo: 'hello',
  loading: false,
  approveLabel: 'Approve',
  approving: false,
  canApprove: true,
  onApprove: jest.fn(),
  onReject: jest.fn(),
  networkSwitch: { visible: true, networkName: 'Testnet', onConfirm: jest.fn(), onCancel: jest.fn() },
  ...overrides,
});

describe('DappRequestPage', () => {
  it('renders a multi-message request and reports every action', async () => {
    const page = props();

    await renderPage(<DappRequestPage {...page} />);

    expect(screen.getByText('Gnoswap')).toBeTruthy();
    expect(screen.getByText(address)).toBeTruthy();
    expect(screen.getAllByText('Call')).toHaveLength(2);
    expect(screen.getByText('Send')).toBeTruthy();
    expect(screen.getByText('gno.land/r/gnoswap/v1/router')).toBeTruthy();
    expect(screen.getByText('hello')).toBeTruthy();
    expect(screen.getByText('0.001 GNOT')).toBeTruthy();
    expect(screen.getByText('Use Testnet for this action.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reject' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(page.onReject).toHaveBeenCalledTimes(1);
    expect(page.onApprove).toHaveBeenCalledTimes(1);
    expect(page.networkSwitch?.onConfirm).toHaveBeenCalledTimes(1);
    expect(page.networkSwitch?.onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading and error states and blocks approval', async () => {
    const page = props({ messages: [], fee: undefined, memo: '', loading: true, error: 'Insufficient balance', canApprove: false, networkSwitch: undefined });

    await renderPage(<DappRequestPage {...page} />);

    expect(screen.getByText('Insufficient balance')).toBeTruthy();
    expect(screen.queryByText('Memo')).toBeNull();
    expect(screen.queryByText('Network fee')).toBeNull();
    expect(screen.queryByText('Switch network?')).toBeNull();
    await fireEvent.press(screen.getByTestId('dapp-approve'));
    expect(page.onApprove).not.toHaveBeenCalled();
  });

  it('disables rejecting while approving', async () => {
    const page = props({ approving: true, networkSwitch: undefined });

    await renderPage(<DappRequestPage {...page} />);
    await fireEvent.press(screen.getByTestId('dapp-reject'));
    await fireEvent.press(screen.getByTestId('dapp-approve'));

    expect(page.onReject).not.toHaveBeenCalled();
    expect(page.onApprove).not.toHaveBeenCalled();
  });
});
