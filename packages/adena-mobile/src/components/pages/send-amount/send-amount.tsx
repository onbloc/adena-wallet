import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { shortenAddress } from '../../../utils/address';
import { Avatar, Button, Chip, Text } from '../../atoms';
import {
  BottomSheet,
  FeeSelectorProps,
  InlineAlert,
  KeypadKey,
  ListRow,
  NumericKeypad,
  ReviewSheet,
  Screen,
  TextField,
  TopBar,
} from '../../molecules';
import { styles } from './send-amount.styles';

// All labels are pre-formatted with their symbols (fees are always in the native token).
export interface TransferReview {
  amountLabel: string;
  recipientAddress: string;
  networkName: string;
  memo?: string;
  totalLabel?: string;
  fee: FeeSelectorProps;
}

export interface TokenOptionView {
  key: string;
  symbol: string;
  name: string;
  balanceLabel?: string;
}

export interface SendAmountPageProps {
  amount: string;
  symbol: string;
  available?: string;
  recipientAddress: string;
  recipientLabel: string;
  error?: string;
  canReview: boolean;
  preparing: boolean;
  onKeyPress: (key: KeypadKey) => void;
  onMax: () => void;
  onReview: () => void;
  onBack: () => void;
  review?: TransferReview;
  confirming: boolean;
  reviewError?: string;
  onConfirm: () => void;
  onCloseReview: () => void;
  memo: string;
  onChangeMemo: (value: string) => void;
  memoSheetVisible: boolean;
  onOpenMemo: () => void;
  onCloseMemo: () => void;
  tokenOptions: TokenOptionView[];
  tokenPickerVisible: boolean;
  onOpenTokenPicker: () => void;
  onCloseTokenPicker: () => void;
  onSelectToken: (tokenId: string) => void;
}

export const SendAmountPage = (props: SendAmountPageProps): ReactElement => (
  <Screen
    scrollable={false}
    header={<TopBar title='Send amount' onBack={props.onBack} />}
    footer={(
      <Button
        label='Review transfer'
        loadingLabel='Estimating fee…'
        disabled={!props.canReview}
        loading={props.preparing}
        onPress={props.onReview}
        testID='send-review'
      />
    )}
  >
    <View style={styles.amountBlock}>
      <Text variant='meta' color='secondary'>You send</Text>
      <View style={styles.amountRow}>
        <Text variant='display' tabular numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
          {props.amount || '0'}
        </Text>
        <Chip label={props.symbol} trailingIcon='chevronDown' onPress={props.onOpenTokenPicker} />
      </View>
      <View style={styles.availableRow}>
        <Text variant='meta' color='secondary' tabular>{`Available ${props.available ?? '…'} ${props.symbol}`}</Text>
        <Chip label='Max' onPress={props.onMax} disabled={props.available === undefined} />
      </View>
    </View>
    <ListRow
      leading={<Avatar name={props.recipientLabel} />}
      label={props.recipientLabel}
      description={shortenAddress(props.recipientAddress)}
      showChevron={false}
    />
    <ListRow label='Memo' value={props.memo || 'Optional'} onPress={props.onOpenMemo} />
    {props.error && <InlineAlert tone='error' title={props.error} />}
    <View style={styles.keypad}>
      <NumericKeypad onKeyPress={props.onKeyPress} />
    </View>
    {props.review && (
      <ReviewSheet
        visible
        title='Review transfer'
        rows={[
          { label: 'To', value: props.review.recipientAddress, multiline: true },
          { label: 'Network', value: props.review.networkName },
          ...(props.review.memo ? [{ label: 'Memo', value: props.review.memo, multiline: true }] : []),
          ...(props.review.totalLabel ? [{ label: 'Total', value: props.review.totalLabel, emphasis: true }] : []),
        ]}
        fee={props.review.fee}
        error={props.reviewError}
        confirmLabel='Confirm send'
        confirming={props.confirming}
        onConfirm={props.onConfirm}
        onClose={props.onCloseReview}
      >
        <Text variant='display' tabular align='center' adjustsFontSizeToFit numberOfLines={1}>{props.review.amountLabel}</Text>
      </ReviewSheet>
    )}
    <BottomSheet visible={props.memoSheetVisible} title='Memo' onClose={props.onCloseMemo}>
      <TextField label='Memo (optional)' value={props.memo} onChangeText={props.onChangeMemo} placeholder='Add a note' maxLength={256} autoFocus />
      <Button label='Done' onPress={props.onCloseMemo} />
    </BottomSheet>
    <BottomSheet visible={props.tokenPickerVisible} title='Select token' onClose={props.onCloseTokenPicker}>
      {props.tokenOptions.map((option) => {
        const handlePress = (): void => props.onSelectToken(option.key);

        return (
          <ListRow
            key={option.key}
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
