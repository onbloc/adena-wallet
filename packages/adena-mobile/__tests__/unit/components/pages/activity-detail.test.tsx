import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ActivityDetailPage, ActivityDetailPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const hash = 'A1B2C3D4E5F60718293A4B5C6D7E8F9011223344556677889900AABBCCDDEEFF';

const onCopyAddress = jest.fn();
const onCopyHash = jest.fn();

const props = (overrides: Partial<ActivityDetailPageProps> = {}): ActivityDetailPageProps => ({
  title: 'Sent GNOT',
  amountLabel: '-1,000,000,000.123456 GNOT',
  amountColor: 'primary',
  status: 'Confirmed',
  rows: [
    { label: 'To', value: 'g1jg8m...fvsqf5', onCopy: onCopyAddress, copyLabel: 'Copy to address' },
    { label: 'Transaction hash', value: 'A1B2C3...DDEEFF', onCopy: onCopyHash, copyLabel: 'Copy transaction hash' },
    { label: 'Fee', value: '0.0001 GNOT' },
  ],
  onOpenExplorer: jest.fn(),
  explorerName: 'Gnoscan',
  onBack: jest.fn(),
  ...overrides,
});

describe('ActivityDetailPage', () => {
  it('renders a confirmed transfer and reports every action', async () => {
    const page = props();

    await renderPage(<ActivityDetailPage {...page} />);

    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('Sent GNOT')).toBeTruthy();
    expect(screen.getByText('-1,000,000,000.123456 GNOT')).toBeTruthy();
    expect(screen.getByText('A1B2C3...DDEEFF')).toBeTruthy();
    expect(screen.queryByText(hash)).toBeNull();
    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
    expect(screen.getByText('0.0001 GNOT')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'View on Gnoscan' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Copy transaction hash' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Copy to address' }));

    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(page.onOpenExplorer).toHaveBeenCalledTimes(1);
    expect(onCopyHash).toHaveBeenCalledTimes(1);
    expect(onCopyAddress).toHaveBeenCalledTimes(1);
  });

  it('renders a failed call without amount, explorer or rows', async () => {
    await renderPage(<ActivityDetailPage {...props({ status: 'Failed', amountLabel: undefined, amountColor: 'error', onOpenExplorer: undefined, rows: [] })} />);

    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.queryByText('-1,000,000,000.123456 GNOT')).toBeNull();
    expect(screen.queryByRole('button', { name: 'View on Gnoscan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy transaction hash' })).toBeNull();
  });

  it('names the explorer of the network', async () => {
    await renderPage(<ActivityDetailPage {...props({ explorerName: 'Mintscan' })} />);

    expect(screen.getByRole('button', { name: 'View on Mintscan' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View on Gnoscan' })).toBeNull();
  });
});
