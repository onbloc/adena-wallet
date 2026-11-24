import React, { ReactElement, useRef } from 'react';
import { Pressable, PressableStateCallbackType, ScrollView, StyleProp, TextInputInstance, View, ViewStyle } from 'react-native';

import { LocalTokenIcon } from '../../../domain/token';
import { Badge, Skeleton, Text } from '../../atoms';
import { BottomSheet, EmptyState, InlineAlert, SearchField, SectionLabel, TokenImage } from '../../molecules';
import { useStyles } from './swap.styles';

export interface SwapTokenView {
  id: string;
  symbol: string;
  name: string;
  localIcon?: LocalTokenIcon;
  imageUrl?: string;
  // Shortened package path; absent for the native coin.
  pathLabel?: string;
  balanceLabel?: string;
  fiatLabel?: string;
  verified: boolean;
}

export interface SwapTokenSheetProps {
  visible: boolean;
  title: string;
  query: string;
  onChangeQuery: (value: string) => void;
  quickTokens: SwapTokenView[];
  tokens: SwapTokenView[];
  loading: boolean;
  error?: string;
  onSelect: (tokenId: string) => void;
  onClose: () => void;
}

const QuickToken = ({ token, onSelect }: { token: SwapTokenView; onSelect: (id: string) => void }): ReactElement => {
  const styles = useStyles();
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.quickToken, pressed && styles.quickTokenPressed];

  return (
    <Pressable accessibilityRole='button' accessibilityLabel={token.symbol} onPress={() => onSelect(token.id)} style={stylePressable}>
      <TokenImage symbol={token.symbol} localIcon={token.localIcon} imageUrl={token.imageUrl} size={24} />
      <Text variant='row'>{token.symbol}</Text>
    </Pressable>
  );
};

const TokenRow = ({ token, onSelect }: { token: SwapTokenView; onSelect: (id: string) => void }): ReactElement => {
  const styles = useStyles();
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.tokenRow, pressed && styles.tokenRowPressed];

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${token.name}, ${token.symbol}`}
      onPress={() => onSelect(token.id)}
      style={stylePressable}
      testID={`swap-token-${token.id}`}
    >
      <TokenImage symbol={token.symbol} localIcon={token.localIcon} imageUrl={token.imageUrl} size={36} />
      <View style={styles.tokenRowText}>
        <View style={styles.tokenRowTitle}>
          <Text variant='row' numberOfLines={1}>{token.name}</Text>
          {!token.verified && <Badge label='Unverified' tone='warning' />}
        </View>
        <Text variant='meta' color='secondary' numberOfLines={1}>
          {token.pathLabel ? `${token.symbol} · ${token.pathLabel}` : token.symbol}
        </Text>
      </View>
      {token.balanceLabel !== undefined && (
        <View style={styles.tokenRowBalance}>
          <Text variant='row' tabular>{token.balanceLabel}</Text>
          {token.fiatLabel && <Text variant='meta' color='secondary' tabular>{token.fiatLabel}</Text>}
        </View>
      )}
    </Pressable>
  );
};

// Search by name, symbol or path, quick picks, then every token by 24h volume.
export const SwapTokenSheet = (props: SwapTokenSheetProps): ReactElement => {
  const styles = useStyles();
  const inputRef = useRef<TextInputInstance>(null);

  return (
    <BottomSheet visible={props.visible} title={props.title} onClose={props.onClose}>
      <SearchField
        ref={inputRef}
        value={props.query}
        onChangeText={props.onChangeQuery}
        placeholder='Search name, symbol or path'
        returnKeyType='search'
      />
      <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent} keyboardShouldPersistTaps='handled'>
        {props.quickTokens.length > 0 && props.query.length === 0 && (
          <View style={styles.quickTokens}>
            {props.quickTokens.map(token => <QuickToken key={token.id} token={token} onSelect={props.onSelect} />)}
          </View>
        )}
        {props.error && <InlineAlert tone='error' title={props.error} />}
        <SectionLabel label={props.query ? 'Results' : 'Tokens by 24H volume'} />
        {props.loading && [0, 1, 2].map(index => <Skeleton key={index} height={52} rounded />)}
        {!props.loading && props.tokens.length === 0 && !props.error && (
          <EmptyState title='No tokens found' description='Try another name, symbol or package path.' />
        )}
        {props.tokens.map(token => <TokenRow key={token.id} token={token} onSelect={props.onSelect} />)}
      </ScrollView>
    </BottomSheet>
  );
};
