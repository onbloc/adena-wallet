import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {GRC20TokenModel} from '@types';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text} from 'react-native';

import {addToken} from '../../core/tokens';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Button, Field, Screen} from '../../ui/components';
import {useModal} from '../../ui/modal';
import {colors, fonts} from '../../ui/theme';
import {TokenRow} from '../../ui/token-row';

type Props = NativeStackScreenProps<MainStackParams, 'AddToken'>;

const PAGE_SIZE = 50;

/**
 * The extension's Add Custom Token: the on-chain GRC20 registry, a page at a
 * time, filtered by name, symbol or token path.
 */
export function AddTokenScreen({navigation}: Props) {
  const {net, account} = useWallet();
  const {confirm} = useModal();
  const [items, setItems] = useState<GRC20TokenModel[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const loadMore = useCallback(async () => {
    if (!net || loading) {
      return;
    }
    setLoading(true);
    try {
      const page = await net.tokenService.fetchGRC20TokensPaged({
        offset: items.length,
        limit: PAGE_SIZE,
      });
      setItems(current => [...current, ...page.items]);
      setTotal(page.totalCount);
    } catch {
      setTotal(current => current ?? 0);
    } finally {
      setLoading(false);
    }
  }, [net, loading, items.length]);

  useEffect(() => {
    loadMore();
    // First page once; later pages on request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net]);

  const query = keyword.trim().toLowerCase();
  const filtered = items.filter(
    token =>
      query === '' ||
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query) ||
      token.tokenId.toLowerCase().includes(query),
  );
  const hasMore = total !== null && items.length < total;

  const add = async (token: GRC20TokenModel) => {
    if (!net || !account) {
      return;
    }
    const ok = await confirm({
      title: `Add ${token.symbol}`,
      message: `${token.name}. Anyone can register a token under any name; check the path before trusting it.`,
      detail: token.tokenId,
      confirmText: 'Add',
    });
    if (!ok) {
      return;
    }
    await addToken(net, account.id, token);
    navigation.goBack();
  };

  return (
    <Screen
      footer={
        hasMore ? (
          <Button
            variant="secondary"
            title="Load More"
            loading={loading}
            onPress={loadMore}
          />
        ) : null
      }>
      <Field
        label="Search"
        hideLabel
        placeholder="Search name, symbol or path"
        value={keyword}
        onChangeText={setKeyword}
      />
      {loading && items.length === 0 && (
        <ActivityIndicator color={colors.textMuted} />
      )}
      {!loading && total === 0 && (
        <Text style={styles.empty}>No tokens found on this network</Text>
      )}
      {filtered.map(token => (
        <TokenRow
          key={token.tokenId}
          token={token}
          detail={token.tokenId}
          onPress={() => add(token)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {...fonts.body1Reg, color: colors.textMuted, textAlign: 'center'},
});
