import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { EmptyState, ListRow, Screen, TopBar } from '../../molecules';
import { styles } from './checkout.styles';

export interface CheckoutProviderView {
  id: string;
  name: string;
  // e.g. "Debit card · Apple Pay".
  paymentMethods: string;
}

export interface CheckoutPageProps {
  // Formatted fiat amount, e.g. "$150.00".
  amountLabel: string;
  tokenName: string;
  providers: CheckoutProviderView[];
  onSelectProvider: (id: string) => void;
  onBack: () => void;
}

export const CheckoutPage = (props: CheckoutPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Checkout with' onBack={props.onBack} />}
    footer={(
      <Text variant='meta' color='secondary'>
        Continue on the provider’s website to review the final quote, payment details and fees.
      </Text>
    )}
  >
    <View style={styles.amountBlock}>
      <Text variant='display' tabular numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>{props.amountLabel}</Text>
      <Text variant='meta' color='secondary'>{`Buying ${props.tokenName}`}</Text>
    </View>
    {props.providers.length === 0
      ? <EmptyState title='No providers available' description={`No payment provider supports ${props.tokenName} yet.`} />
      : (
          <View style={styles.providers}>
            {props.providers.map((provider) => {
              const handlePress = (): void => props.onSelectProvider(provider.id);

              return <ListRow key={provider.id} label={provider.name} description={provider.paymentMethods || undefined} onPress={handlePress} />;
            })}
          </View>
        )}
  </Screen>
);
