import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, ScrollView, StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';

import { SwapActionState, SwapRouteView } from '../../../presenters/swap.presenter';
import { useThemeColors } from '../../../theme';
import { Button, Divider, Icon, IconButton, Spinner, Text } from '../../atoms';
import {
  EmptyState,
  FeeSelectorProps,
  InlineAlert,
  KeypadKey,
  KeyValueRow,
  NumericKeypad,
  ReviewSheet,
  Screen,
  TokenImage,
  TopBar,
} from '../../molecules';
import { useStyles } from './swap.styles';
import { SwapSettingsSheet, SwapSettingsSheetProps } from './swap-settings-sheet';
import { SwapTokenSheet, SwapTokenSheetProps, SwapTokenView } from './swap-token-sheet';

export interface SwapSideView {
  token?: SwapTokenView;
  // Display amount; empty shows the placeholder.
  amount: string;
  fiatLabel?: string;
  balanceLabel?: string;
  insufficient?: boolean;
  // Estimated side waiting for a quote.
  loading?: boolean;
  // The card the keypad edits (the exact side).
  focused?: boolean;
}

export interface SwapDetailsView {
  rateLabel?: string;
  priceImpactLabel: string;
  priceImpactHigh: boolean;
  slippageLabel: string;
  // "Min. received" for exact-in, "Max. sent" for exact-out.
  limit: { label: string; value: string };
  routerFeeLabel: string;
  routes: SwapRouteView[];
}

export interface SwapReviewView {
  pay: { caption: string; token: SwapTokenView; amountLabel: string; fiatLabel?: string };
  receive: { caption: string; token: SwapTokenView; amountLabel: string; fiatLabel?: string };
  rows: { label: string; value: string; multiline?: boolean; emphasis?: boolean }[];
  warning?: string;
  fee: FeeSelectorProps;
}

export const SWAP_PERCENTS = [25, 50, 75, 100] as const;

export type SwapPercent = (typeof SWAP_PERCENTS)[number];

export interface SwapPageProps {
  onClose: () => void;
  onOpenSettings: () => void;
  // Shown instead of the form on networks without GnoSwap.
  unavailable?: { title: string; description: string };
  sell: SwapSideView;
  buy: SwapSideView;
  suggestedTokens: SwapTokenView[];
  onSelectSellToken: () => void;
  onSelectBuyToken: () => void;
  onPickBuyToken: (tokenId: string) => void;
  onFocusSell: () => void;
  onFocusBuy: () => void;
  onFlip: () => void;
  details?: SwapDetailsView;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  onPercent: (percent: SwapPercent) => void;
  // Chip whose amount is being estimated (native max); every chip waits meanwhile.
  percentLoading?: SwapPercent;
  onKeyPress: (key: KeypadKey) => void;
  action: SwapActionState;
  onAction: () => void;
  error?: string;
  notice?: string;
  tokenSheet: SwapTokenSheetProps;
  settingsSheet: SwapSettingsSheetProps;
  review?: SwapReviewView;
  confirming: boolean;
  reviewError?: string;
  onConfirm: () => void;
  onCloseReview: () => void;
}

// iPhone SE-class heights get shorter keypad rows so cards, chips, keypad and button still fit.
const COMPACT_HEIGHT = 700;
const COMPACT_KEY_HEIGHT = 44;

interface PercentChipProps {
  percent: SwapPercent;
  loading: boolean;
  disabled: boolean;
  onPress: (percent: SwapPercent) => void;
}

// Equal-width secondary pill; the one being estimated shows a spinner.
const PercentChip = ({ percent, loading, disabled, onPress }: PercentChipProps): ReactElement => {
  const styles = useStyles();
  const label = percent === 100 ? 'Max' : `${percent}%`;
  const inactive = disabled || loading;
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.percentChip,
    disabled && styles.percentChipDisabled,
    pressed && !inactive && styles.percentChipPressed,
  ];

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={inactive}
      onPress={() => onPress(percent)}
      style={stylePressable}
    >
      {loading ? <Spinner size={16} /> : <Text variant='meta' color={disabled ? 'disabled' : 'primary'}>{label}</Text>}
    </Pressable>
  );
};

const TokenPill = ({ token, onPress, label }: { token: SwapTokenView; onPress: () => void; label: string }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.tokenPill, pressed && styles.tokenPillPressed];

  return (
    <Pressable accessibilityRole='button' accessibilityLabel={`${label}, ${token.symbol}`} onPress={onPress} style={stylePressable}>
      <TokenImage symbol={token.symbol} localIcon={token.localIcon} imageUrl={token.imageUrl} size={32} />
      <Text variant='row'>{token.symbol}</Text>
      <Icon name='chevronDown' size={18} color={colors.icon.secondary} />
    </Pressable>
  );
};

// Tapping the amount makes this card the one the keypad edits; the focused card shows a caret.
const AmountField = ({ side, label, onFocus, testID }: { side: SwapSideView; label: string; onFocus: () => void; testID?: string }): ReactElement => {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${label} amount`}
      accessibilityValue={{ text: side.amount || '0' }}
      accessibilityState={{ selected: Boolean(side.focused), busy: Boolean(side.loading) }}
      onPress={onFocus}
      style={styles.amountField}
      testID={testID}
    >
      <Text
        variant='display'
        tabular
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.amount, (!side.amount || side.loading) && styles.amountPlaceholder]}
      >
        {side.amount || '0'}
      </Text>
      {side.focused && <View style={styles.caret} />}
    </Pressable>
  );
};

const SellCard = ({ side, onSelect, onFocus }: { side: SwapSideView; onSelect: () => void; onFocus: () => void }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={[styles.card, side.focused && styles.cardFocused]} testID='swap-sell'>
      <Text variant='meta' color='secondary'>Sell</Text>
      <View style={styles.cardRow}>
        <AmountField side={side} label='Sell' onFocus={onFocus} testID='swap-sell-amount' />
        {side.token
          ? <TokenPill token={side.token} onPress={onSelect} label='Token to sell' />
          : <Button label='Select token' size='compact' onPress={onSelect} />}
      </View>
      <View style={styles.cardRow}>
        <Text variant='meta' color='secondary' tabular>{side.fiatLabel ?? ' '}</Text>
        {side.balanceLabel !== undefined && (
          <Text variant='meta' color={side.insufficient ? 'error' : 'secondary'} tabular testID='swap-sell-balance'>
            {`Balance ${side.balanceLabel}`}
          </Text>
        )}
      </View>
    </View>
  );
};

interface BuyCardProps {
  side: SwapSideView;
  suggestions: SwapTokenView[];
  onSelect: () => void;
  onPick: (id: string) => void;
  onFocus: () => void;
}

const BuyCard = ({ side, suggestions, onSelect, onPick, onFocus }: BuyCardProps): ReactElement => {
  const styles = useStyles();
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.suggestion, pressed && styles.suggestionPressed];

  if (!side.token) {
    return (
      <View style={[styles.card, styles.buyCard]} testID='swap-buy'>
        <Text variant='meta' color='secondary'>Buy</Text>
        <View style={styles.cardRow}>
          <View style={styles.suggestions}>
            {suggestions.map(token => (
              <Pressable key={token.id} accessibilityRole='button' accessibilityLabel={`Buy ${token.symbol}`} onPress={() => onPick(token.id)} style={stylePressable}>
                <TokenImage symbol={token.symbol} localIcon={token.localIcon} imageUrl={token.imageUrl} size={32} />
              </Pressable>
            ))}
          </View>
          <View style={styles.selectToken}>
            <Button label='Select token' size='compact' onPress={onSelect} testID='swap-select-buy' />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.buyCard, side.focused && styles.cardFocused]} testID='swap-buy'>
      <Text variant='meta' color='secondary'>Buy</Text>
      <View style={styles.cardRow}>
        <AmountField side={side} label='Buy' onFocus={onFocus} testID='swap-buy-amount' />
        <TokenPill token={side.token} onPress={onSelect} label='Token to buy' />
      </View>
      <View style={styles.cardRow}>
        <Text variant='meta' color='secondary' tabular>{side.fiatLabel ?? ' '}</Text>
        {side.balanceLabel !== undefined && <Text variant='meta' color='secondary' tabular>{`Balance ${side.balanceLabel}`}</Text>}
      </View>
    </View>
  );
};

const RouteList = ({ routes }: { routes: SwapRouteView[] }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.details}>
      {routes.map(route => (
        <View key={route.key} style={styles.route} accessibilityLabel={`${route.share} via ${route.steps.map(step => step.symbol).join(', ')}`}>
          <Text variant='meta' tabular>{route.share}</Text>
          {route.steps.map((step, index) => (
            <View key={`${route.key}>${step.symbol}:${step.fee ?? ''}`} style={styles.routeStep}>
              {index > 0 && <Icon name='chevronRight' size={14} color={colors.icon.secondary} />}
              {step.fee && <Text variant='meta' color='secondary'>{`(${step.fee})`}</Text>}
              <Text variant='meta'>{step.symbol}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const Details = ({ details, expanded, onToggle }: { details: SwapDetailsView; expanded: boolean; onToggle: () => void }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View>
      <Pressable accessibilityRole='button' accessibilityState={{ expanded }} onPress={onToggle} style={styles.detailsHeader} testID='swap-details-toggle'>
        <Text variant='meta' tabular style={styles.detailsRate} numberOfLines={1}>{details.rateLabel ?? 'Quote'}</Text>
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={18} color={colors.icon.secondary} />
      </Pressable>
      {expanded && (
        <View style={styles.details}>
          <KeyValueRow label='Price impact' value={details.priceImpactLabel} emphasis={details.priceImpactHigh} />
          <KeyValueRow label='Max. slippage' value={details.slippageLabel} />
          <KeyValueRow label={details.limit.label} value={details.limit.value} />
          <KeyValueRow label='Router fee' value={details.routerFeeLabel} />
          <Text variant='meta' color='secondary'>Route</Text>
          <RouteList routes={details.routes} />
        </View>
      )}
    </View>
  );
};

export const SwapPage = (props: SwapPageProps): ReactElement => {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const colors = useThemeColors();
  const flipStyle = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.flip, pressed && styles.flipPressed];
  const header = (
    <TopBar
      title='Swap'
      variant='large'
      leading={<IconButton icon='close' accessibilityLabel='Close' onPress={props.onClose} />}
      trailing={props.unavailable ? undefined : <IconButton icon='settings' accessibilityLabel='Swap settings' onPress={props.onOpenSettings} testID='swap-settings' />}
    />
  );

  if (props.unavailable) {
    return (
      <Screen header={header}>
        <EmptyState title={props.unavailable.title} description={props.unavailable.description} actionLabel='Close' onAction={props.onClose} />
      </Screen>
    );
  }

  return (
    <Screen
      scrollable={false}
      header={header}
      footer={(
        <Button
          label={props.action.label}
          loadingLabel={props.action.label === 'Review swap' ? 'Preparing…' : props.action.label}
          disabled={props.action.disabled}
          loading={props.action.loading}
          onPress={props.onAction}
          testID='swap-action'
        />
      )}
    >
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps='handled'>
        <View style={styles.cards}>
          <SellCard side={props.sell} onSelect={props.onSelectSellToken} onFocus={props.onFocusSell} />
          <View style={styles.flipWrap}>
            <Pressable accessibilityRole='button' accessibilityLabel='Switch tokens' onPress={props.onFlip} style={flipStyle} testID='swap-flip'>
              <Icon name='arrowDown' size={20} color={colors.icon.primary} />
            </Pressable>
          </View>
          <BuyCard side={props.buy} suggestions={props.suggestedTokens} onSelect={props.onSelectBuyToken} onPick={props.onPickBuyToken} onFocus={props.onFocusBuy} />
        </View>
        {props.details && <Details details={props.details} expanded={props.detailsExpanded} onToggle={props.onToggleDetails} />}
        {props.error && <InlineAlert tone='error' title={props.error} />}
        {props.notice && <InlineAlert tone='warning' title={props.notice} />}
      </ScrollView>
      <View style={styles.dock}>
        <View style={styles.chips}>
          {SWAP_PERCENTS.map(percent => (
            <PercentChip
              key={percent}
              percent={percent}
              loading={props.percentLoading === percent}
              disabled={!props.sell.token || props.sell.balanceLabel === undefined || (props.percentLoading !== undefined && props.percentLoading !== percent)}
              onPress={props.onPercent}
            />
          ))}
        </View>
        <NumericKeypad onKeyPress={props.onKeyPress} keyHeight={height < COMPACT_HEIGHT ? COMPACT_KEY_HEIGHT : undefined} />
      </View>
      <SwapTokenSheet {...props.tokenSheet} />
      <SwapSettingsSheet {...props.settingsSheet} />
      {props.review && (
        <ReviewSheet
          visible
          title='Review swap'
          rows={props.review.rows}
          fee={props.review.fee}
          error={props.reviewError}
          confirmLabel='Confirm swap'
          confirming={props.confirming}
          onConfirm={props.onConfirm}
          onClose={props.onCloseReview}
        >
          <View style={styles.reviewAmounts}>
            <View style={styles.reviewSide}>
              <TokenImage symbol={props.review.pay.token.symbol} localIcon={props.review.pay.token.localIcon} imageUrl={props.review.pay.token.imageUrl} size={36} />
              <View style={styles.reviewSideText}>
                <Text variant='meta' color='secondary'>{props.review.pay.caption}</Text>
                <Text variant='section' tabular selectable>{props.review.pay.amountLabel}</Text>
                {props.review.pay.fiatLabel && <Text variant='meta' color='secondary' tabular>{props.review.pay.fiatLabel}</Text>}
              </View>
            </View>
            <View style={styles.reviewSide}>
              <TokenImage symbol={props.review.receive.token.symbol} localIcon={props.review.receive.token.localIcon} imageUrl={props.review.receive.token.imageUrl} size={36} />
              <View style={styles.reviewSideText}>
                <Text variant='meta' color='secondary'>{props.review.receive.caption}</Text>
                <Text variant='section' tabular selectable>{props.review.receive.amountLabel}</Text>
                {props.review.receive.fiatLabel && <Text variant='meta' color='secondary' tabular>{props.review.receive.fiatLabel}</Text>}
              </View>
            </View>
            <Divider />
          </View>
          {props.review.warning && <InlineAlert tone='warning' title={props.review.warning} />}
        </ReviewSheet>
      )}
    </Screen>
  );
};
