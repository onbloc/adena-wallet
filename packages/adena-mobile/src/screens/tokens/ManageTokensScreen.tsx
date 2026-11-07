import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useState} from 'react';
import {StyleSheet, Switch, Text} from 'react-native';

import {useTokens} from '../../core/use-tokens';
import type {MainStackParams} from '../../navigation/types';
import {Button, Field, Screen} from '../../ui/components';
import {colors, colorTokens, fonts} from '../../ui/theme';
import {TokenRow} from '../../ui/token-row';

type Props = NativeStackScreenProps<MainStackParams, 'ManageTokens'>;

/** The extension's Manage Tokens: search and show/hide; GNOT always shows. */
export function ManageTokensScreen({navigation}: Props) {
  const {tokens, setDisplay, refresh} = useTokens();

  // Back from Add Custom Token: show what was added.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const [keyword, setKeyword] = useState('');
  const query = keyword.trim().toLowerCase();
  const filtered = tokens.filter(
    token =>
      query === '' ||
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query),
  );

  return (
    <Screen
      footer={
        <Button
          testID="manage-tokens-add"
          variant="secondary"
          title="Add Custom Token"
          onPress={() => navigation.navigate('AddToken')}
        />
      }>
      <Field
        label="Search"
        hideLabel
        placeholder="Search"
        value={keyword}
        onChangeText={setKeyword}
      />
      {filtered.length === 0 && (
        <Text style={styles.empty}>No tokens to display</Text>
      )}
      {filtered.map(token => (
        <TokenRow
          key={token.tokenId}
          token={token}
          right={
            token.main && token.type === 'gno-native' ? null : (
              <Switch
                accessibilityLabel={`Show ${token.name}`}
                value={token.display}
                onValueChange={value => setDisplay(token.tokenId, value)}
                trackColor={{
                  true: colors.primary,
                  false: colorTokens.neutral._7,
                }}
              />
            )
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {...fonts.body1Reg, color: colors.textMuted, textAlign: 'center'},
});
