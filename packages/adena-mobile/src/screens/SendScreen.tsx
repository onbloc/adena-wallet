import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';

import {isAddressForNetwork} from '../core/address';
import {parseGnotToUgnot} from '../core/format';
import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {Button, ErrorText, Field, Screen, Title} from '../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'Send'>;

export function SendScreen({navigation, route}: Props) {
  const {net, address} = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const scanned = route.params?.scannedAddress;
    if (scanned) {
      setTo(scanned);
    }
  }, [route.params?.scannedAddress]);

  const next = () => {
    const prefix = net?.network.addressPrefix ?? 'g';
    const recipient = to.trim();
    if (!isAddressForNetwork(recipient, prefix)) {
      setError(`Enter a valid address starting with "${prefix}1".`);
      return;
    }
    if (recipient === address) {
      setError('This is your own address.');
      return;
    }
    const ugnot = parseGnotToUgnot(amount);
    if (!ugnot) {
      setError('Enter an amount greater than 0 with at most 6 decimals.');
      return;
    }
    navigation.navigate('SendConfirm', {
      to: recipient,
      ugnot,
      memo: memo.trim(),
    });
  };

  return (
    <Screen>
      <Title>Send GNOT</Title>
      <Field label="Recipient address" value={to} onChangeText={setTo} />
      <Button
        title="Scan QR code"
        variant="secondary"
        onPress={() => navigation.navigate('QrScan')}
      />
      <Field
        label="Amount (GNOT)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Field
        label="Memo (optional, public on chain)"
        value={memo}
        onChangeText={setMemo}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Review" onPress={next} disabled={!to || !amount} />
    </Screen>
  );
}
