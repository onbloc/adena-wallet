import React, { ReactElement, useRef } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, TextInputInstance, View, ViewStyle } from 'react-native';

import { LocalTokenIcon } from '../../../domain/token';
import { useThemeColors } from '../../../theme';
import { formatAddress } from '../../../utils/address';
import { Avatar, Button, Chip, Icon, Text } from '../../atoms';
import {
  BottomSheet,
  InlineAlert,
  KeypadKey,
  ListRow,
  NumericKeypad,
  Screen,
  TextField,
  TokenImage,
  TopBar,
  TransferReview,
  TransferReviewSheet,
} from '../../molecules';
import { useStyles } from './send-amount.styles';

export interface TokenOptionView {
  key: string;
  symbol: string;
  name: string;
  balanceLabel?: string;
}

export interface SendAmountPageProps {
  amount: string;
  symbol: string;
  tokenLocalIcon?: LocalTokenIcon;
  tokenImageUrl?: string;
  // Pre-formatted fiat estimate of the amount, e.g. "≈ $12.30".
  fiatLabel?: string;
  available?: string;
  recipientAddress: string;
  recipientLabel: string;
  onChangeRecipient?: () => void;
  error?: string;
  // Non-error status, e.g. a previous transfer still awaiting confirmation.
  notice?: string;
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

interface TokenSelectorProps {
  symbol: string;
  localIcon?: LocalTokenIcon;
  imageUrl?: string;
  onPress: () => void;
}

// Pill beside the amount that opens the token picker.
const TokenSelector = ({ symbol, localIcon, imageUrl, onPress }: TokenSelectorProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.tokenSelector, pressed && styles.tokenSelectorPressed];

  return (
    <Pressable accessibilityRole='button' accessibilityLabel={`Select token, ${symbol}`} onPress={onPress} style={stylePressable}>
      <TokenImage symbol={symbol} localIcon={localIcon} imageUrl={imageUrl} size={24} />
      <Text variant='row'>{symbol}</Text>
      <Icon name='chevronDown' size={20} color={colors.icon.primary} />
    </Pressable>
  );
};

interface MemoSheetProps {
  visible: boolean;
  memo: string;
  onChangeMemo: (value: string) => void;
  onClose: () => void;
}

// Focuses as the sheet presents so the keyboard rises with it; retried once it settles.
const MemoSheet = ({ visible, memo, onChangeMemo, onClose }: MemoSheetProps): ReactElement => {
  const inputRef = useRef<TextInputInstance>(null);

  const focus = (): void => {
    if (!inputRef.current?.isFocused()) {
      inputRef.current?.focus();
    }
  };

  return (
    <BottomSheet visible={visible} title='Memo' onClose={onClose} onWillOpen={focus} onOpened={focus}>
      <TextField
        ref={inputRef}
        label='Memo (optional)'
        value={memo}
        onChangeText={onChangeMemo}
        placeholder='Add a note'
        maxLength={256}
        returnKeyType='done'
        submitBehavior='blurAndSubmit'
        onSubmitEditing={onClose}
      />
      <Button label='Done' onPress={onClose} />
    </BottomSheet>
  );
};

export const SendAmountPage = (props: SendAmountPageProps): ReactElement => {
  const styles = useStyles();

  return (
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
          <TokenSelector symbol={props.symbol} localIcon={props.tokenLocalIcon} imageUrl={props.tokenImageUrl} onPress={props.onOpenTokenPicker} />
        </View>
        {props.fiatLabel ? <Text variant='meta' color='secondary' tabular>{props.fiatLabel}</Text> : null}
      </View>
      <View style={styles.availableRow}>
        <Text variant='meta' color='secondary' tabular>{`Available ${props.available ?? '…'} ${props.symbol}`}</Text>
        <Chip label='Max' onPress={props.onMax} disabled={props.available === undefined} />
      </View>
      <ListRow
        leading={<Avatar name={props.recipientLabel} />}
        label={props.recipientLabel}
        description={formatAddress(props.recipientAddress)}
        onPress={props.onChangeRecipient}
      />
      <ListRow label='Memo' value={props.memo || 'Optional'} onPress={props.onOpenMemo} />
      {props.error && <InlineAlert tone='error' title={props.error} />}
      {!props.error && props.notice && <InlineAlert tone='warning' title={props.notice} />}
      <View style={styles.keypad}>
        <NumericKeypad onKeyPress={props.onKeyPress} />
      </View>
      {props.review && (
        <TransferReviewSheet
          review={props.review}
          symbol={props.symbol}
          tokenLocalIcon={props.tokenLocalIcon}
          tokenImageUrl={props.tokenImageUrl}
          error={props.reviewError}
          confirming={props.confirming}
          onConfirm={props.onConfirm}
          onClose={props.onCloseReview}
        />
      )}
      <MemoSheet visible={props.memoSheetVisible} memo={props.memo} onChangeMemo={props.onChangeMemo} onClose={props.onCloseMemo} />
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
};
