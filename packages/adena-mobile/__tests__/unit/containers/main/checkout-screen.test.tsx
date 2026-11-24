import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CheckoutScreen } from '../../../../src/containers/main/checkout-screen';
import { OnrampService } from '../../../../src/services/onramp.service';
import { useToastStore } from '../../../../src/stores/toast.store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const PROVIDER = {
  id: 'fixture',
  name: 'Fixture Pay',
  paymentMethods: ['Debit card', 'Apple Pay'],
  urlTemplate: 'https://buy.example/?wallet={address}&amount={amount}&fiat={currency}&asset={asset}',
  assets: { [`${NETWORK.id}:ugnot`]: 'GNOT' },
};

const setup = async (providers = [PROVIDER]) => {
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => ADDRESS },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    tokenService: { getStoredToken: () => ({ id: 'ugnot', name: 'Gno.land', symbol: 'GNOT' }) },
    onrampService: new OnrampService({ providers }),
  });
  const navigation = { goBack: jest.fn() };
  const Screen = CheckoutScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'Checkout', name: 'Checkout', params: { tokenId: 'ugnot', amount: '150.5' } }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { navigation };
};

describe('CheckoutScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the provider URL built for this wallet and order', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await setup();
    expect(screen.getByText('$150.50')).toBeTruthy();
    expect(screen.getByText('Buying Gno.land')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Fixture Pay, Debit card · Apple Pay' }));

    expect(openURL).toHaveBeenCalledWith(`https://buy.example/?wallet=${ADDRESS}&amount=150.5&fiat=USD&asset=GNOT`);
  });

  it('reports a URL that cannot be opened', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    useToastStore.setState({ toast: null });

    await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Fixture Pay, Debit card · Apple Pay' }));

    expect(useToastStore.getState().toast).toMatchObject({ tone: 'error', message: 'Couldn’t open the provider’s website' });
  });

  it('lists nothing when no provider supports the token', async () => {
    await setup([]);

    expect(screen.getByText('No providers available')).toBeTruthy();
  });
});
