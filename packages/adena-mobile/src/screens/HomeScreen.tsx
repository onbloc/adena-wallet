import GnotLogo from '@assets/gnot-logo-white.svg';
import MenuIcon from '@assets/menu.svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import BigNumber from 'bignumber.js';
import React, {useCallback, useEffect, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {accountDisplayName, useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {copyWithExpiry} from '../security/sensitive-clipboard';
import {
  CopyCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DepositIcon,
  GlobeIcon,
  SendIcon,
} from '../ui/icons';
import {colors, colorTokens, fonts, radius} from '../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Home'>;

/** Integer and fraction, so the fraction can be drawn smaller (HighlightNumber). */
function splitAmount(value: number): {whole: string; fraction: string} {
  const [whole, fraction] = BigNumber(value).toFormat().split('.');
  return {whole, fraction: fraction ? `.${fraction}` : ''};
}

/** The extension's wallet main: top menu, network band, balance, actions, tokens. */
export function HomeScreen({navigation}: Props) {
  const {net, address, account, accountNames} = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  const amount = balance === null ? null : splitAmount(balance);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topMenu}>
        <View style={styles.topLeft}>
          <Pressable
            testID="home-accounts"
            accessibilityRole="button"
            accessibilityLabel="Accounts"
            hitSlop={8}
            onPress={() => navigation.navigate('Accounts')}
            style={styles.accountButton}>
            <Text style={styles.accountName} numberOfLines={1}>
              {account ? accountDisplayName(account, accountNames) : 'Account'}
            </Text>
            <ChevronDownIcon />
          </Pressable>
          {address && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy address"
              hitSlop={10}
              onPress={() => {
                copyWithExpiry(address);
                setCopied(true);
              }}>
              {copied ? <CopyCheckIcon /> : <CopyIcon />}
            </Pressable>
          )}
        </View>
        <View style={styles.topRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore dApps"
            hitSlop={8}
            onPress={() => navigation.navigate('Browser')}>
            <GlobeIcon />
          </Pressable>
          <Pressable
            testID="home-settings"
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            onPress={() => navigation.navigate('Settings')}>
            <MenuIcon width={24} height={24} />
          </Pressable>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Networks')}
        style={({pressed}) => [styles.networkBand, pressed && styles.pressed]}>
        <Text style={styles.networkText}>
          You are on{' '}
          <Text style={styles.networkName}>{net?.network.networkName}</Text>
        </Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.textMuted}
          />
        }>
        <View style={styles.balance}>
          <Text style={styles.balanceWhole} numberOfLines={1}>
            {amount ? amount.whole : '-'}
            <Text style={styles.balanceFraction}>{amount?.fraction}</Text>
            <Text style={styles.balanceUnit}> GNOT</Text>
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
        <View style={styles.actions}>
          <MainAction
            label="Deposit"
            icon={<DepositIcon />}
            onPress={() => navigation.navigate('Receive')}
          />
          <MainAction
            label="Send"
            icon={<SendIcon />}
            onPress={() => navigation.navigate('Send')}
          />
          <MainAction
            label="Explore"
            icon={<GlobeIcon size={19} />}
            onPress={() => navigation.navigate('Browser')}
          />
        </View>
        <View style={styles.token}>
          <View style={styles.tokenLogo}>
            <GnotLogo width={22} height={22} />
          </View>
          <Text style={styles.tokenName}>Gnoland</Text>
          <Text style={styles.tokenBalance} numberOfLines={1}>
            {amount ? amount.whole : '-'}
            <Text style={styles.tokenFraction}>{amount?.fraction}</Text> GNOT
          </Text>
        </View>
        <Pressable
          testID="home-nft"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Nft')}
          style={({pressed}) => [styles.token, pressed && styles.pressed]}>
          <Text style={styles.tokenName}>NFTs</Text>
          <ChevronRightIcon />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MainAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.action, pressed && styles.actionPressed]}>
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const {neutral, primary} = colorTokens;

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  pressed: {opacity: 0.85},
  topMenu: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  accountButton: {flexDirection: 'row', alignItems: 'center', gap: 6},
  accountName: {...fonts.body1Bold, color: colors.text, maxWidth: 160},
  topRight: {flexDirection: 'row', alignItems: 'center', gap: 12},
  networkBand: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primary._1,
  },
  networkText: {...fonts.light13, color: primary._2},
  networkName: {...fonts.bold13},
  body: {paddingHorizontal: 20, paddingBottom: 40},
  balance: {height: 80, justifyContent: 'center'},
  balanceWhole: {
    fontFamily: fonts.header2.fontFamily,
    fontSize: 32,
    lineHeight: 39,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  balanceFraction: {fontSize: 24},
  balanceUnit: {fontSize: 24},
  error: {...fonts.captionReg, color: colors.danger},
  actions: {flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 30},
  action: {
    flex: 1,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: neutral._7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPressed: {backgroundColor: neutral._6},
  actionLabel: {...fonts.body2Bold, lineHeight: 16, color: colors.text},
  token: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: neutral._9,
  },
  tokenLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 12,
    backgroundColor: neutral._7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenName: {...fonts.body2Bold, lineHeight: 17, color: colors.text, flex: 1},
  tokenBalance: {
    ...fonts.body2Reg,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  tokenFraction: {fontSize: 11},
});
