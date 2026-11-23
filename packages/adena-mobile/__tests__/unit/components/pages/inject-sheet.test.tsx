import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { InjectSheetPage, InjectSheetPageProps, SheetAuthMode } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<InjectSheetPageProps> = {}): InjectSheetPageProps => ({
  title: 'Approve transaction',
  dappName: 'Gnoswap',
  origin: 'https://gnoswap.io',
  rows: [{ label: 'Account', value: 'Account 1' }, { label: 'Address', value: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', multiline: true }],
  messages: [
    { title: 'Call', details: [{ label: 'Function', value: 'Swap' }] },
    { title: 'Call', details: [{ label: 'Package', value: 'gno.land/r/gnoswap/v1/router' }] },
  ],
  fee: '0.001 GNOT',
  loading: false,
  approveLabel: 'Approve',
  approving: false,
  canApprove: true,
  onApprove: jest.fn(),
  onReject: jest.fn(),
  ...overrides,
});

describe('InjectSheetPage', () => {
  it('renders the request with password auth and reports every action', async () => {
    const auth = { mode: SheetAuthMode.PASSWORD, password: '', onChangePassword: jest.fn() };
    const page = props({ auth });

    await renderPage(<InjectSheetPage {...page} />);

    expect(screen.getByText('Approve transaction')).toBeTruthy();
    expect(screen.getAllByText('Call')).toHaveLength(2);
    expect(screen.getByText('gno.land/r/gnoswap/v1/router')).toBeTruthy();
    expect(screen.getByText('0.001 GNOT')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Wallet password'), 'secret');
    await fireEvent.press(screen.getByRole('button', { name: 'Reject' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));

    expect(auth.onChangePassword).toHaveBeenCalledWith('secret');
    expect(page.onReject).toHaveBeenCalledTimes(1);
    expect(page.onApprove).toHaveBeenCalledTimes(1);
  });

  it('labels the approve button with the biometric method', async () => {
    await renderPage(<InjectSheetPage {...props({ auth: { mode: SheetAuthMode.BIOMETRIC, biometricLabel: 'Face ID', password: '', onChangePassword: jest.fn() } })} />);

    expect(screen.getByRole('button', { name: 'Approve with Face ID' })).toBeTruthy();
    expect(screen.queryByLabelText('Wallet password')).toBeNull();
  });

  it('keeps the plain label when biometrics have no label', async () => {
    await renderPage(<InjectSheetPage {...props({ auth: { mode: SheetAuthMode.BIOMETRIC, password: '', onChangePassword: jest.fn() } })} />);

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  it('shows loading and error states and blocks actions', async () => {
    const page = props({ messages: [], fee: undefined, loading: true, error: 'Request expired', canApprove: false, approving: true });

    await renderPage(<InjectSheetPage {...page} />);

    expect(screen.getByText('Request expired')).toBeTruthy();
    expect(screen.queryByText('Network fee')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Reject' }));
    await fireEvent.press(screen.getByTestId('inject-sheet-approve'));
    expect(page.onReject).not.toHaveBeenCalled();
    expect(page.onApprove).not.toHaveBeenCalled();
  });

  it('only offers to close when unavailable', async () => {
    const page = props({ unavailable: { title: 'Set up Adena first', description: 'Create a wallet to continue.' } });

    await renderPage(<InjectSheetPage {...page} />);

    expect(screen.getByText('Set up Adena first')).toBeTruthy();
    expect(screen.queryByText('Approve transaction')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(page.onReject).toHaveBeenCalledTimes(1);
  });
});
