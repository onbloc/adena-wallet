import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { applyKeypadKey, KeypadKey } from '../../../components/molecules';
import { BuyCryptoPage, BuyTokenView } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { tokenPriceKey } from '../../../domain/token';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainStackParamList } from '../../../navigation/types';
import { AssetView } from '../../../presenters/asset.presenter';
import { ONRAMP_CURRENCY } from '../../../services/onramp.service';
import { isPositiveAmount } from '../../../utils/amount';
import { BigNumber } from '../../../utils/big-number';

const FIAT_DECIMALS = 2;
const ESTIMATE_DECIMALS = 6;

const groupDigits = (amount: string): string => {
  const [integer, fraction] = amount.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};

const toTokenView = (asset: AssetView): BuyTokenView => ({
  key: asset.token.id,
  symbol: asset.token.symbol,
  name: asset.token.name,
  localIcon: asset.token.localIcon,
  imageUrl: asset.token.imageUrl,
  balanceLabel: asset.quantityLabel ? `Balance: ${asset.quantityLabel}` : undefined,
});

// Fiat amount entry; the quote, payment and KYC happen on the provider's website.
export const BuyCryptoScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'BuyCrypto'>): ReactElement => {
  const { onrampService } = useContainer();
  const { network, assets, prices } = useWalletAssets();
  const [amount, setAmount] = useState('');
  const [tokenId, setTokenId] = useState(route.params?.tokenId);
  const [pickerVisible, setPickerVisible] = useState(false);

  const supported = assets.filter(asset => onrampService.isSupported(network, asset.token.id));
  const selected = assets.find(asset => asset.token.id === tokenId) ?? supported[0] ?? assets.find(asset => asset.token.isNative);
  const token = selected?.token;
  const available = Boolean(token && onrampService.isSupported(network, token.id));
  const price = token ? prices?.[tokenPriceKey(token.id, network.id)]?.usd : undefined;
  const estimate = token && price && price > 0 && isPositiveAmount(amount)
    ? new BigNumber(amount).div(price).decimalPlaces(ESTIMATE_DECIMALS, BigNumber.ROUND_DOWN)
    : undefined;

  const handleKeyPress = (key: KeypadKey): void => setAmount(current => applyKeypadKey(current, key, FIAT_DECIMALS));

  const handleOpenTokenPicker = (): void => setPickerVisible(true);

  const handleCloseTokenPicker = (): void => setPickerVisible(false);

  const handleSelectToken = (key: string): void => {
    setTokenId(key);
    setPickerVisible(false);
  };

  const handleContinue = (): void => {
    if (token && available && isPositiveAmount(amount)) {
      navigation.navigate('Checkout', { tokenId: token.id, amount: new BigNumber(amount).toFixed() });
    }
  };

  return (
    <BuyCryptoPage
      amountLabel={groupDigits(amount)}
      currency={ONRAMP_CURRENCY}
      estimateLabel={estimate && token && available ? `Estimated ${estimate.toFormat()} ${token.symbol} before fees` : undefined}
      token={selected ? toTokenView(selected) : undefined}
      tokenOptions={supported.map(toTokenView)}
      tokenPickerVisible={pickerVisible}
      onOpenTokenPicker={handleOpenTokenPicker}
      onCloseTokenPicker={handleCloseTokenPicker}
      onSelectToken={handleSelectToken}
      unavailable={token && !available
        ? { title: `Buying ${token.symbol} isn’t available yet`, description: 'No payment provider supports this token yet. Check back later.' }
        : undefined}
      canContinue={available && isPositiveAmount(amount)}
      onKeyPress={handleKeyPress}
      onContinue={handleContinue}
      onBack={navigation.goBack}
    />
  );
};
