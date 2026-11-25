import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
import { Linking } from 'react-native';

import { CheckoutPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useToastStore } from '../../../stores/toast.store';
import { formatUSD } from '../../../utils/price';

export const CheckoutScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'Checkout'>): ReactElement => {
  const { tokenId, amount } = route.params;
  const { onrampService, tokenService } = useContainer();
  const { account, network, address } = useWalletSnapshot();
  const showToast = useToastStore(state => state.show);
  const token = account ? tokenService.getStoredToken(account, network, tokenId) : undefined;
  const providers = onrampService.getProviders(network, tokenId);

  const handleSelectProvider = (providerId: string): void => {
    try {
      const url = onrampService.buildUrl(providerId, { network, tokenId, address, amount });

      Linking.openURL(url).catch(() => showToast('Couldn’t open the provider’s website', 'error'));
    }
    catch {
      showToast('This provider can’t be used for this token', 'error');
    }
  };

  return (
    <CheckoutPage
      amountLabel={formatUSD(Number(amount))}
      tokenName={token?.name ?? token?.symbol ?? tokenId}
      providers={providers.map(provider => ({ id: provider.id, name: provider.name, paymentMethods: provider.paymentMethods.join(' · ') }))}
      onSelectProvider={handleSelectProvider}
      onBack={navigation.goBack}
    />
  );
};
