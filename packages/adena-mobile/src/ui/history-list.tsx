import AddPackageIcon from '@assets/addpkg.svg';
import UnknownToken from '@assets/common-unknown-token.svg';
import ContractIcon from '@assets/contract.svg';
import FailedIcon from '@assets/failed.svg';
import SuccessIcon from '@assets/success.svg';
import type {TransactionInfo} from '@types';
import BigNumber from 'bignumber.js';
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {groupByDay} from '../core/history';
import {Button} from './components';
import {TokenLogo} from './token-logo';
import {colors, colorTokens, fonts, radius} from './theme';

/** An amount as the extension's TokenBalance: grouped digits, "+" for received. */
export function formatHistoryAmount(transaction: TransactionInfo): string {
  if (transaction.type === 'MULTI_CONTRACT_CALL') {
    return 'More';
  }
  const {value, denom} = transaction.amount;
  if (transaction.type === 'TRANSFER_GRC721') {
    return `${denom} #${value}`;
  }
  const number = BigNumber(value);
  const text = number.isFinite() ? number.toFormat() : value;
  return `${transaction.valueType === 'ACTIVE' ? '+' : ''}${text} ${denom}`;
}

function parseLogo(logo: string) {
  try {
    const parsed = JSON.parse(logo);
    return parsed && typeof parsed.type === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function TypeIcon({
  type,
  logo,
}: {
  type: TransactionInfo['type'];
  logo: string;
}) {
  const token = type === 'TRANSFER' ? parseLogo(logo) : null;
  if (token) {
    return <TokenLogo token={token} />;
  }
  if (type === 'ADD_PACKAGE') {
    return <AddPackageIcon width={34} height={34} />;
  }
  if (type === 'CONTRACT_CALL' || type === 'MULTI_CONTRACT_CALL') {
    return <ContractIcon width={34} height={34} />;
  }
  return <UnknownToken width={34} height={34} />;
}

export function HistoryItem({
  transaction,
  onPress,
}: {
  transaction: TransactionInfo;
  onPress: () => void;
}) {
  const failed = transaction.status === 'FAIL';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.item, pressed && styles.pressed]}>
      <View style={styles.logo}>
        <TypeIcon type={transaction.type} logo={transaction.logo} />
        <View style={styles.badge}>
          {failed ? (
            <FailedIcon width={14} height={14} />
          ) : (
            <SuccessIcon width={14} height={14} />
          )}
        </View>
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.title}
          {transaction.extraInfo ? (
            <Text style={styles.extra}> {transaction.extraInfo}</Text>
          ) : null}
        </Text>
        {transaction.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.amount,
          transaction.valueType === 'ACTIVE' && styles.active,
          (transaction.valueType === 'BLUR' || failed) && styles.blur,
        ]}
        numberOfLines={1}>
        {formatHistoryAmount(transaction)}
      </Text>
    </Pressable>
  );
}

/** Day-grouped history with "Load More"; empty and error states included. */
export function HistoryList({
  items,
  loading,
  failed,
  hasMore,
  supported,
  onLoadMore,
  onPressItem,
}: {
  items: TransactionInfo[];
  loading: boolean;
  failed: boolean;
  hasMore: boolean;
  supported: boolean;
  onLoadMore: () => void;
  onPressItem: (transaction: TransactionInfo) => void;
}) {
  if (!supported) {
    return (
      <Text style={styles.empty}>History is not available on this network.</Text>
    );
  }
  if (items.length === 0) {
    if (loading) {
      return <ActivityIndicator style={styles.spinner} color={colors.textMuted} />;
    }
    return (
      <Text style={styles.empty}>
        {failed ? 'Could not load the history.' : 'No transaction to display'}
      </Text>
    );
  }
  return (
    <View style={styles.list}>
      {groupByDay(items).map(group => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.day}>{group.title}</Text>
          {group.transactions.map((transaction, index) => (
            <HistoryItem
              key={`${transaction.hash}-${index}`}
              transaction={transaction}
              onPress={() => onPressItem(transaction)}
            />
          ))}
        </View>
      ))}
      {hasMore && (
        <Button
          variant="secondary"
          title="Load More"
          loading={loading}
          onPress={onLoadMore}
        />
      )}
    </View>
  );
}

const {neutral, green} = colorTokens;

const styles = StyleSheet.create({
  list: {gap: 16},
  group: {gap: 8},
  day: {...fonts.body2Bold, color: colors.textMuted},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: neutral._9,
  },
  pressed: {opacity: 0.85},
  logo: {width: 34, height: 34},
  badge: {position: 'absolute', right: -3, bottom: -3},
  texts: {flex: 1},
  title: {...fonts.body2Bold, color: colors.text},
  extra: {...fonts.captionReg, color: colors.textMuted},
  description: {...fonts.captionReg, color: colors.textMuted},
  amount: {...fonts.body2Reg, color: colors.text, maxWidth: '45%'},
  active: {color: green._5},
  blur: {color: colors.textMuted},
  empty: {
    ...fonts.body1Reg,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  spinner: {marginTop: 40},
});
