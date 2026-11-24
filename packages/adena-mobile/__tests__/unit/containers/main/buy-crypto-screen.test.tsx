import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BuyCryptoScreen } from '../../../../src/containers/main/buy-crypto-screen';
import { Token, tokenPriceKey, TokenType } from '../../../../src/domain/token';
import { useWalletAssets } from '../../../../src/hooks/use-wallet-assets';
import { OnrampService } from '../../../../src/services/onramp.service';
import { NETWORK } from '../../../helpers/query-wrapper';

jest.mock('../../../../src/hooks/use-wallet-assets', () => ({ useWalletAssets: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const GNOT: Token = { id: 'ugnot', networkId: NETWORK.id, family: NETWORK.family, type: TokenType.NATIVE, name: 'Gno.land', symbol: 'GNOT', decimals: 6, denom: 'ugnot', isNative: true };
const GNS: Token = { ...GNOT, id: 'gns', type: TokenType.GRC20, name: 'Gnoswap', symbol: 'GNS', denom: undefined, isNative: false };
const provider = (assets: Record<string, string>) => ({ id: 'fixture', name: 'Fixture Pay', paymentMethods: ['Debit card'], urlTemplate: 'https://buy.example/?a={asset}', assets });

const setup = async (assets: Record<string, string>, params?: Record<string, unknown>) => {
  jest.mocked(useWalletAssets).mockReturnValue({
    network: NETWORK,
    assets: [
      { token: GNOT, amount: '1000000', quantityLabel: '1 GNOT', trend: 'neutral', loading: false },
      { token: GNS, amount: '0', quantityLabel: '0 GNS', trend: 'neutral', loading: false },
    ],
    prices: { [tokenPriceKey('ugnot', NETWORK.id)]: { tokenId: 'ugnot', networkId: NETWORK.id, usd: 0.4, change24h: null } },
  } as unknown as ReturnType<typeof useWalletAssets>);
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const Screen = BuyCryptoScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;
  const { ContainerProvider } = jest.requireActual('../../../../src/di/container-provider');
  const container = { onrampService: new OnrampService({ providers: [provider(assets)] }) };

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ContainerProvider container={container}>
        <Screen navigation={navigation} route={{ key: 'BuyCrypto', name: 'BuyCrypto', params }} />
      </ContainerProvider>
    </SafeAreaProvider>,
  );

  return { navigation };
};

const type = async (...keys: string[]): Promise<void> => {
  for (const key of keys) {
    await fireEvent.press(screen.getByRole('keyboardkey', { name: key === '.' ? 'Decimal point' : key }));
  }
};

describe('BuyCryptoScreen', () => {
  it('estimates the token amount from the price and continues to checkout', async () => {
    const { navigation } = await setup({ [`${NETWORK.id}:ugnot`]: 'GNOT' });

    await type('1', '0', '0', '0', '.', '5', '5', '9');
    expect(screen.getByTestId('buy-amount').props.children).toBe('1,000.55');
    expect(screen.getByText('Estimated 2,501.375 GNOT before fees')).toBeTruthy();
    expect(screen.getByText('Balance: 1 GNOT')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('buy-continue'));
    expect(navigation.navigate).toHaveBeenCalledWith('Checkout', { tokenId: 'ugnot', amount: '1000.55' });
  });

  it('lists only supported tokens and switches between them', async () => {
    const { navigation } = await setup({ [`${NETWORK.id}:ugnot`]: 'GNOT', [`${NETWORK.id}:gns`]: 'GNS' });

    await fireEvent.press(screen.getByTestId('buy-token'));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnoswap, Balance: 0 GNS' }));
    await type('5');
    // No GNS price, so no estimate.
    expect(screen.queryByText(/Estimated/)).toBeNull();
    await fireEvent.press(screen.getByTestId('buy-continue'));
    expect(navigation.navigate).toHaveBeenCalledWith('Checkout', { tokenId: 'gns', amount: '5' });
  });

  it('explains an unsupported token and blocks continue', async () => {
    const { navigation } = await setup({}, { tokenId: 'ugnot' });

    await type('5');
    expect(screen.getByText('Buying GNOT isn’t available yet')).toBeTruthy();
    expect(screen.queryByText(/Estimated/)).toBeNull();
    await fireEvent.press(screen.getByTestId('buy-continue'));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
