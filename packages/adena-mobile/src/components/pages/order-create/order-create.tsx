import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Chip, Text } from '../../atoms';
import { BottomSheet, InlineAlert, KeyValueRow, ListRow, Screen, SectionLabel, SelectField, TextField, TopBar } from '../../molecules';
import { CardOptionView } from '../card-create/card-create';
import { CardReviewSheet, CardReviewSheetProps } from '../cards/card-review-sheet';
import { useStyles } from './order-create.styles';

export interface OrderTokenOptionView {
  id: string;
  symbol: string;
  name: string;
  balanceLabel?: string;
}

export interface OrderCreatePageProps {
  kind: 'dca' | 'limit';
  onBack: () => void;
  inputLabel?: string;
  inputBalanceLabel?: string;
  outputLabel?: string;
  onPickInput: () => void;
  onPickOutput: () => void;
  tokenSheet: { visible: boolean; title: string; options: OrderTokenOptionView[]; onSelect: (id: string) => void; onClose: () => void };
  tokensError?: string;
  // Pair-level availability and limits from the order realm.
  rulesNotice?: string;
  checkingRules: boolean;
  amount: string;
  amountLabel: string;
  amountError?: string;
  onChangeAmount: (value: string) => void;
  // DCA
  count?: string;
  countError?: string;
  onChangeCount?: (value: string) => void;
  intervals?: CardOptionView<number>[];
  onSelectInterval?: (interval: number) => void;
  // Limit
  price?: string;
  priceLabel?: string;
  priceError?: string;
  onChangePrice?: (value: string) => void;
  marketPriceLabel?: string;
  onUseMarketPrice?: () => void;
  slippages?: CardOptionView<number>[];
  onSelectSlippage?: (bps: number) => void;
  durations?: CardOptionView<number>[];
  onSelectDuration?: (duration: number) => void;
  summary: { label: string; value: string }[];
  canReview: boolean;
  preparing: boolean;
  error?: string;
  onReview: () => void;
  review: CardReviewSheetProps;
}

const Options = ({ options, onSelect }: { options: CardOptionView<number>[]; onSelect: (key: number) => void }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const handlePress = (): void => onSelect(option.key);

        return <Chip key={option.key} label={option.label} selected={option.selected} disabled={option.disabled} onPress={handlePress} />;
      })}
    </View>
  );
};

export const OrderCreatePage = (props: OrderCreatePageProps): ReactElement => {
  const styles = useStyles();
  const dca = props.kind === 'dca';

  return (
    <Screen
      header={<TopBar title={dca ? 'Recurring buy' : 'Limit order'} onBack={props.onBack} />}
      footer={(
        <View style={styles.footer}>
          {props.error && <InlineAlert tone='error' title={props.error} />}
          <Button label='Review' disabled={!props.canReview} loading={props.preparing} loadingLabel='Preparing…' onPress={props.onReview} testID='order-review' />
        </View>
      )}
    >
      <View style={styles.body}>
        <Text variant='meta' color='secondary'>
          {dca
            ? 'GnoSwap buys on a schedule from the amount you set aside. You can cancel any time and get back what was not used.'
            : 'GnoSwap sells when its pool reaches your price, never below it. Unfilled input comes back when it expires or you cancel.'}
        </Text>
        {props.tokensError && <InlineAlert tone='error' title='Could not load tokens' description={props.tokensError} />}
        <SelectField label={dca ? 'Pay with' : 'Sell'} value={props.inputLabel} placeholder='Choose a token' onPress={props.onPickInput} />
        {props.inputBalanceLabel && <Text variant='meta' color='secondary'>{`Available ${props.inputBalanceLabel}`}</Text>}
        <SelectField label={dca ? 'Buy' : 'For'} value={props.outputLabel} placeholder='Choose a token' onPress={props.onPickOutput} />
        {props.checkingRules && <Text variant='meta' color='secondary'>Checking GnoSwap…</Text>}
        {props.rulesNotice && <InlineAlert tone='warning' title={props.rulesNotice} />}
        <TextField
          label={props.amountLabel}
          placeholder='0'
          value={props.amount}
          error={props.amountError}
          keyboardType='decimal-pad'
          returnKeyType='done'
          onChangeText={props.onChangeAmount}
          testID='order-amount-input'
        />
        {dca && props.intervals && props.onSelectInterval && (
          <>
            <SectionLabel label='How often' />
            <Options options={props.intervals} onSelect={props.onSelectInterval} />
            <TextField
              label='Number of buys'
              placeholder='10'
              value={props.count}
              error={props.countError}
              keyboardType='number-pad'
              returnKeyType='done'
              onChangeText={props.onChangeCount}
              testID='order-count-input'
            />
          </>
        )}
        {!dca && (
          <>
            <TextField
              label={props.priceLabel ?? 'Price'}
              placeholder='0'
              value={props.price}
              error={props.priceError}
              keyboardType='decimal-pad'
              returnKeyType='done'
              onChangeText={props.onChangePrice}
              testID='order-price-input'
            />
            {props.marketPriceLabel && (
              <Button label={`Use market price · ${props.marketPriceLabel}`} tone='tertiary' size='compact' fullWidth={false} onPress={props.onUseMarketPrice} />
            )}
            {props.slippages && props.onSelectSlippage && (
              <>
                <SectionLabel label='Allowed slippage' />
                <Options options={props.slippages} onSelect={props.onSelectSlippage} />
              </>
            )}
            {props.durations && props.onSelectDuration && (
              <>
                <SectionLabel label='Expires in' />
                <Options options={props.durations} onSelect={props.onSelectDuration} />
              </>
            )}
          </>
        )}
        {props.summary.length > 0 && (
          <View style={styles.summary}>
            {props.summary.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} />)}
          </View>
        )}
      </View>
      <BottomSheet visible={props.tokenSheet.visible} title={props.tokenSheet.title} onClose={props.tokenSheet.onClose}>
        {props.tokenSheet.options.map((option) => {
          const handlePress = (): void => props.tokenSheet.onSelect(option.id);

          return <ListRow key={option.id} label={option.symbol} description={option.name} value={option.balanceLabel} onPress={handlePress} testID={`order-token-${option.id}`} />;
        })}
      </BottomSheet>
      <CardReviewSheet {...props.review} />
    </Screen>
  );
};
