import {isTokenPath} from '@common/utils/grc20-token-path';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {formatTokenAmount} from '../../core/tokens';
import {useHistory} from '../../core/use-history';
import {useTokens} from '../../core/use-tokens';
import type {MainStackParams} from '../../navigation/types';
import {Body, Button, Screen} from '../../ui/components';
import {HistoryList} from '../../ui/history-list';
import {colors, fonts} from '../../ui/theme';
import {TokenLogo} from '../../ui/token-logo';

type Props = NativeStackScreenProps<MainStackParams, 'TokenDetails'>;

/** The extension's token details: balance, Deposit, Send and the token's history. */
export function TokenDetailsScreen({navigation, route}: Props) {
  const {tokens, balances, loading} = useTokens();
  const token = tokens.find(item => item.tokenId === route.params.tokenId);
  // Decided from the id, so the right history loads before the token list does.
  const history = useHistory(
    isTokenPath(route.params.tokenId)
      ? {kind: 'grc20', tokenPath: route.params.tokenId}
      : {kind: 'native'},
  );

  useLayoutEffect(() => {
    navigation.setOptions({title: token?.name ?? ''});
  }, [navigation, token?.name]);

  if (!token) {
    return (
      <Screen>
        <Body muted>{loading ? 'Loading…' : 'This token is not in your list.'}</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.head}>
        <TokenLogo token={token} size={56} />
        <Text style={styles.balance} numberOfLines={1}>
          {formatTokenAmount(balances[token.tokenId] ?? null, token.decimals)}{' '}
          {token.symbol}
        </Text>
        {token.type === 'grc20' && (
          <Text selectable style={styles.path}>
            {token.tokenId}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button
          variant="secondary"
          title="Deposit"
          onPress={() => navigation.navigate('Receive')}
          style={styles.flex}
        />
        <Button
          title="Send"
          testID="token-send"
          onPress={() =>
            navigation.navigate(
              'Send',
              token.type === 'grc20' ? {tokenId: token.tokenId} : undefined,
            )
          }
          style={styles.flex}
        />
      </View>
      <HistoryList
        items={history.items}
        loading={history.loading}
        failed={history.failed}
        hasMore={history.hasMore}
        supported={history.supported}
        onLoadMore={history.loadMore}
        onPressItem={transaction =>
          navigation.navigate('TransactionDetail', {transaction})
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {alignItems: 'center', gap: 10, paddingVertical: 16},
  balance: {...fonts.header4, color: colors.text},
  path: {...fonts.captionReg, color: colors.textMuted, textAlign: 'center'},
  actions: {flexDirection: 'row', gap: 10},
  flex: {flex: 1},
});
