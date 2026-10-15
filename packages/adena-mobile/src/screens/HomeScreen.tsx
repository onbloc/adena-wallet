import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import BigNumber from 'bignumber.js';
import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';

import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {Address} from '../ui/address';
import {Body, Button, Card} from '../ui/components';
import {colors, spacing} from '../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const {net, address, lock} = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!net || !address) {
      return;
    }
    setRefreshing(true);
    try {
      setBalance(await net.balanceService.getGnotTokenBalance(address));
      setError('');
    } catch {
      setError('Could not load the balance from the network.');
    } finally {
      setRefreshing(false);
    }
  }, [net, address]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }>
      <Text style={styles.network}>{net?.network.networkName}</Text>
      <Card>
        <Text style={styles.balance}>
          {balance === null ? '-' : BigNumber(balance).toFormat()} GNOT
        </Text>
        {address && <Address value={address} />}
        {!!error && <Body muted>{error}</Body>}
      </Card>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title="Send" onPress={() => navigation.navigate('Send')} />
        </View>
        <View style={styles.action}>
          <Button
            title="Receive"
            variant="secondary"
            onPress={() => navigation.navigate('Receive')}
          />
        </View>
      </View>
      <Button
        title="Explore dApps"
        variant="secondary"
        onPress={() => navigation.navigate('Browser')}
      />
      <Button
        title="Settings"
        variant="secondary"
        onPress={() => navigation.navigate('Settings')}
      />
      <Button title="Lock" variant="secondary" onPress={lock} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  network: {color: colors.textMuted, fontSize: 13},
  balance: {fontSize: 28, fontWeight: '700', color: colors.text},
  actions: {flexDirection: 'row', gap: spacing.md},
  action: {flex: 1},
});
