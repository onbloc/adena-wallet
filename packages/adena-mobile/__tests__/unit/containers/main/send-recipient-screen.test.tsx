import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SendRecipientScreen } from '../../../../src/containers/main/send-recipient-screen';
import { normalizeAddress } from '../../../../src/utils/address';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async (params: Record<string, unknown> = { tokenId: 'ugnot' }) => {
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1self' },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    addressBookService: { getEntriesFor: () => [], findByAddress: () => undefined },
    chainRegistry: { forNetwork: () => ({ normalizeAddress: (value: string) => normalizeAddress(value, 'g') }) },
  });
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
  const route = { key: 'SendRecipient-1', name: 'SendRecipient', params };
  const Screen = SendRecipientScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;
  const tree = (routeParams: Record<string, unknown>) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ ...route, params: routeParams }} /></Wrapper>
    </SafeAreaProvider>
  );
  const view = await render(tree(params));

  return { navigation, rerender: (next: Record<string, unknown>) => view.rerender(tree(next)) };
};

describe('SendRecipientScreen', () => {
  it('opens the scanner with this route as the return target', async () => {
    const { navigation } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Scan QR code' }));
    expect(navigation.navigate).toHaveBeenCalledWith('QrScanner', { returnKey: 'SendRecipient-1' });
  });

  it('fills the field from a scanned address, resolves it and consumes the param', async () => {
    const { navigation, rerender } = await setup();

    await rerender({ tokenId: 'ugnot', scannedAddress: ADDRESS });

    expect(screen.getByLabelText('Address').props.value).toBe(ADDRESS);
    expect(screen.getByText('Results')).toBeTruthy();
    expect(navigation.setParams).toHaveBeenCalledWith({ scannedAddress: undefined });
    await fireEvent.press(screen.getByTestId('recipient-result'));
    expect(navigation.navigate).toHaveBeenCalledWith('SendAmount', { toAddress: ADDRESS, tokenId: 'ugnot' });
  });

  it('normalizes an all-uppercase address before matching and sending', async () => {
    const { navigation } = await setup();

    await fireEvent.changeText(screen.getByLabelText('Address'), ADDRESS.toUpperCase());
    await fireEvent.press(screen.getByTestId('recipient-result'));

    expect(navigation.navigate).toHaveBeenCalledWith('SendAmount', { toAddress: ADDRESS, tokenId: 'ugnot' });
  });

  it('rejects a mixed-case address', async () => {
    await setup();

    await fireEvent.changeText(screen.getByLabelText('Address'), `G${ADDRESS.slice(1)}`);

    expect(screen.getByText('Enter a valid Gno.land address.')).toBeTruthy();
  });

  it('validates typed input and clears it', async () => {
    await setup();
    const input = screen.getByLabelText('Address');

    await fireEvent.changeText(input, 'g1nope');
    expect(screen.getByText('Enter a valid Gno.land address.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText('Address').props.value).toBe('');
    expect(screen.queryByText('Enter a valid Gno.land address.')).toBeNull();
  });
});
