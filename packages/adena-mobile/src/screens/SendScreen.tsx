import GnotLogo from '@assets/gnot-logo-white.svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import BigNumber from 'bignumber.js';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {isAddressForNetwork} from '../core/address';
import {parseGnotToUgnot} from '../core/format';
import {
  fetchTokenBalances,
  formatTokenAmount,
  isGRC20TokenModel,
  parseTokenAmount,
} from '../core/tokens';
import {useTokens} from '../core/use-tokens';
import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {ButtonPair, Screen} from '../ui/components';
import {formBox, INPUT_PROPS} from '../ui/form-box';
import {MemoField} from '../ui/memo-field';
import {RecipientField} from '../ui/recipient-field';
import {colors, colorTokens, fonts} from '../ui/theme';
import {TokenLogo} from '../ui/token-logo';

type Props = NativeStackScreenProps<MainStackParams, 'Send'>;

/** The extension's transfer input: logo, recipient, amount, memo (GNOT or a GRC20). */
export function SendScreen({navigation, route}: Props) {
  const {net, address} = useWallet();
  const {tokens} = useTokens();
  const tokenId = route.params?.tokenId;
  const grc20 = tokens.find(
    item => item.tokenId === tokenId && isGRC20TokenModel(item),
  );
  const token = grc20 && isGRC20TokenModel(grc20) ? grc20 : null;
  const [tokenRaw, setTokenRaw] = useState<string | null>(null);
  const symbol = token?.symbol ?? 'GNOT';
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<{
    field: 'to' | 'amount';
    message: string;
  } | null>(null);

  useEffect(() => {
    const scanned = route.params?.scannedAddress;
    if (scanned) {
      setTo(scanned);
    }
  }, [route.params?.scannedAddress]);

  useLayoutEffect(() => {
    navigation.setOptions({title: `Send ${symbol}`});
  }, [navigation, symbol]);

  useEffect(() => {
    if (net && address && token) {
      fetchTokenBalances(net, address, [token]).then(([read]) =>
        setTokenRaw(read.raw),
      );
    }
  }, [net, address, token]);

  useEffect(() => {
    if (net && address && !tokenId) {
      net.balanceService
        .getGnotTokenBalance(address)
        .then(setBalance)
        .catch(() => setBalance(null));
    }
  }, [net, address, tokenId]);

  const prefix = net?.network.addressPrefix ?? 'g';

  const next = () => {
    const recipient = to.trim();
    if (!isAddressForNetwork(recipient, prefix)) {
      setError({field: 'to', message: 'Invalid address'});
      return;
    }
    if (recipient === address) {
      setError({field: 'to', message: 'This is your own address.'});
      return;
    }
    if (tokenId) {
      if (!token) {
        return;
      }
      const raw = parseTokenAmount(amount, token.decimals);
      if (!raw) {
        setError({
          field: 'amount',
          message: `Enter an amount greater than 0 with at most ${token.decimals} decimals.`,
        });
        return;
      }
      if (tokenRaw !== null && BigNumber(raw).gt(tokenRaw)) {
        setError({field: 'amount', message: 'Insufficient balance'});
        return;
      }
      navigation.navigate('SendConfirm', {
        kind: 'grc20',
        to: recipient,
        token,
        rawAmount: raw,
        memo: memo.trim(),
      });
      return;
    }
    const ugnot = parseGnotToUgnot(amount);
    if (!ugnot) {
      setError({
        field: 'amount',
        message: 'Enter an amount greater than 0 with at most 6 decimals.',
      });
      return;
    }
    if (balance !== null && BigNumber(amount).gt(balance)) {
      setError({field: 'amount', message: 'Insufficient balance'});
      return;
    }
    navigation.navigate('SendConfirm', {
      kind: 'gnot',
      to: recipient,
      ugnot,
      memo: memo.trim(),
    });
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Next',
            testID: 'send-next',
            disabled: !to || !amount || (!!tokenId && !token),
            onPress: next,
          }}
        />
      }>
      <View style={styles.logo}>
        {token ? (
          <TokenLogo token={token} size={64} />
        ) : (
          <GnotLogo width={64} height={64} />
        )}
      </View>
      <RecipientField
        value={to}
        onChange={text => {
          setTo(text);
          setError(null);
        }}
        error={error?.field === 'to' ? error.message : null}
        onScan={() => navigation.navigate('QrScan', {returnTo: 'Send'})}
      />
      <View style={formBox.group}>
        <View
          style={[formBox.box, error?.field === 'amount' && formBox.boxError]}>
          <TextInput
            {...INPUT_PROPS}
            accessibilityLabel="Amount"
            placeholder="Amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={text => {
              setAmount(text);
              setError(null);
            }}
            style={formBox.input}
          />
          <Text style={styles.unit}>{symbol}</Text>
        </View>
        <Text
          style={[
            styles.caption,
            error?.field === 'amount' && styles.captionError,
          ]}>
          {error?.field === 'amount'
            ? error.message
            : `Balance: ${
                token
                  ? formatTokenAmount(tokenRaw, token.decimals)
                  : balance === null
                  ? '-'
                  : BigNumber(balance).toFormat()
              } ${symbol}`}
        </Text>
      </View>
      <MemoField value={memo} onChange={setMemo} />
    </Screen>
  );
}

const {neutral, red} = colorTokens;

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: neutral._7,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  unit: {...fonts.body2Reg, color: colors.text},
  caption: {
    ...fonts.captionReg,
    color: colors.textMuted,
    paddingHorizontal: 16,
    textAlign: 'right',
  },
  captionError: {color: red._5, textAlign: 'left'},
});
