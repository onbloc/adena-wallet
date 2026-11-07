import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {ActivityIndicator, StyleSheet, Text} from 'react-native';

import {formatTokenAmount} from '../../core/tokens';
import {useTokens} from '../../core/use-tokens';
import type {MainStackParams} from '../../navigation/types';
import {Screen} from '../../ui/components';
import {colors, fonts} from '../../ui/theme';
import {TokenRow} from '../../ui/token-row';

type Props = NativeStackScreenProps<MainStackParams, 'SelectToken'>;

/** The extension's send search: pick which shown token to send. */
export function SelectTokenScreen({navigation}: Props) {
  const {shown, balances, loading} = useTokens();
  return (
    <Screen>
      {loading && shown.length === 0 && (
        <ActivityIndicator color={colors.textMuted} />
      )}
      {shown.map(token => (
        <TokenRow
          key={token.tokenId}
          token={token}
          testID={`select-token-${token.symbol}`}
          onPress={() =>
            navigation.replace(
              'Send',
              token.type === 'grc20' ? {tokenId: token.tokenId} : undefined,
            )
          }
          right={
            <Text style={styles.balance}>
              {formatTokenAmount(balances[token.tokenId] ?? null, token.decimals)}
            </Text>
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: {...fonts.body2Reg, color: colors.text},
});
