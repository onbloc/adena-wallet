import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { LocalTokenIcon } from '../../../domain/token';
import { Button, Text } from '../../atoms';
import { BottomSheet, InlineAlert, KeypadKey, ListRow, NumericKeypad, Screen, TokenImage, TopBar } from '../../molecules';
import { styles } from './buy-crypto.styles';

export interface BuyTokenView {
  key: string;
  symbol: string;
  name: string;
  localIcon?: LocalTokenIcon;
  imageUrl?: string;
  // e.g. "Balance: 12.5 GNOT"; omitted while unknown.
  balanceLabel?: string;
}

export interface BuyCryptoPageProps {
  // Grouped fiat amount as typed, e.g. "1,250.5".
  amountLabel: string;
  currency: string;
  // e.g. "Estimated 120.5 GNOT before fees".
  estimateLabel?: string;
  token?: BuyTokenView;
  tokenOptions: BuyTokenView[];
  tokenPickerVisible: boolean;
  onOpenTokenPicker: () => void;
  onCloseTokenPicker: () => void;
  onSelectToken: (key: string) => void;
  // Set when no provider supports the selected token.
  unavailable?: { title: string; description: string };
  canContinue: boolean;
  onKeyPress: (key: KeypadKey) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const BuyCryptoPage = (props: BuyCryptoPageProps): ReactElement => (
  <Screen
    scrollable={false}
    header={<TopBar title='Buy crypto' onBack={props.onBack} />}
    footer={<Button label='Continue' disabled={!props.canContinue} onPress={props.onContinue} testID='buy-continue' />}
  >
    <View style={styles.amountBlock}>
      <Text variant='meta' color='secondary'>You pay</Text>
      <View style={styles.amountRow}>
        <Text variant='display' tabular numberOfLines={1} adjustsFontSizeToFit style={styles.amount} testID='buy-amount'>
          {props.amountLabel || '0'}
        </Text>
        <View style={styles.currency}>
          <Text variant='row'>{props.currency}</Text>
        </View>
      </View>
      {props.estimateLabel ? <Text variant='meta' color='secondary' tabular>{props.estimateLabel}</Text> : null}
    </View>
    {props.unavailable && <InlineAlert tone='neutral' title={props.unavailable.title} description={props.unavailable.description} />}
    <View style={styles.bottom}>
      {props.token && (
        <ListRow
          leading={<TokenImage symbol={props.token.symbol} localIcon={props.token.localIcon} imageUrl={props.token.imageUrl} />}
          label={props.token.name}
          description={props.token.balanceLabel ?? props.token.symbol}
          onPress={props.tokenOptions.length > 1 ? props.onOpenTokenPicker : undefined}
          testID='buy-token'
        />
      )}
      <NumericKeypad onKeyPress={props.onKeyPress} />
    </View>
    <BottomSheet visible={props.tokenPickerVisible} title='Select token' onClose={props.onCloseTokenPicker}>
      {props.tokenOptions.map((option) => {
        const handlePress = (): void => props.onSelectToken(option.key);

        return (
          <ListRow
            key={option.key}
            leading={<TokenImage symbol={option.symbol} localIcon={option.localIcon} imageUrl={option.imageUrl} />}
            label={option.name}
            description={option.balanceLabel ?? option.symbol}
            showChevron={false}
            onPress={handlePress}
          />
        );
      })}
    </BottomSheet>
  </Screen>
);
