import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { SendRecipientPage, SendRecipientPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const resultAddress = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const bookAddress = 'g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj';
const accountAddress = 'g1manfred47kzduec920z88wfr64ylksmdcedlf5';

const props = (overrides: Partial<SendRecipientPageProps> = {}): SendRecipientPageProps => ({
  query: 'g1jg',
  onChangeQuery: jest.fn(),
  result: { key: 'result', label: 'Unknown address', address: resultAddress },
  addressBook: [{ key: 'book-1', label: 'Alice', address: bookAddress }],
  myAccounts: [{ key: 'acc-2', label: 'Account 2', address: accountAddress }],
  onSelectRecipient: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

describe('SendRecipientPage', () => {
  it('reports query edits, every recipient selection and close', async () => {
    const page = props();

    await renderPage(<SendRecipientPage {...page} />);

    expect(screen.getByText('Results')).toBeTruthy();
    expect(screen.getByText('Address book')).toBeTruthy();
    expect(screen.getByText('My accounts')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Address'), resultAddress);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    await fireEvent.press(screen.getByTestId('recipient-result'));
    await fireEvent.press(screen.getByRole('button', { name: 'Alice, g1us84…njlj' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Account 2, g1manf…dlf5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(page.onChangeQuery).toHaveBeenNthCalledWith(1, resultAddress);
    expect(page.onChangeQuery).toHaveBeenNthCalledWith(2, '');
    expect(page.onSelectRecipient).toHaveBeenNthCalledWith(1, resultAddress);
    expect(page.onSelectRecipient).toHaveBeenNthCalledWith(2, bookAddress);
    expect(page.onSelectRecipient).toHaveBeenNthCalledWith(3, accountAddress);
    expect(page.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the validation error and hides empty sections', async () => {
    await renderPage(<SendRecipientPage {...props({ query: 'g1invalid', result: undefined, error: 'Invalid address', addressBook: [], myAccounts: [] })} />);

    expect(screen.getByText('Invalid address')).toBeTruthy();
    expect(screen.queryByText('Results')).toBeNull();
    expect(screen.queryByText('Address book')).toBeNull();
    expect(screen.queryByText('My accounts')).toBeNull();
  });
});
