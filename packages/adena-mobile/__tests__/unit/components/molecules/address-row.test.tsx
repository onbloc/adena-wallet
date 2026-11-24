import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { AddressRow } from '../../../../src/components/molecules';
import { shortenAddress } from '../../../../src/utils/address';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('AddressRow', () => {
  it('shortens by default and copies on press', async () => {
    const onCopy = jest.fn();

    await render(<AddressRow address={address} onCopy={onCopy} />);
    expect(screen.getByText(shortenAddress(address))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('shows the full selectable address', async () => {
    await render(<AddressRow address={address} onCopy={jest.fn()} full />);
    expect(screen.getByText(address).props.selectable).toBe(true);
  });
});
