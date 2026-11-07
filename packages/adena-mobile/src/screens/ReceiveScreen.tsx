import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {
  CLIPBOARD_CLEAR_MS,
  copyWithExpiry,
} from '../security/sensitive-clipboard';
import {Address} from '../ui/address';
import {Button, Screen} from '../ui/components';
import {colors, colorTokens, fonts} from '../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Receive'>;

/** The extension's Deposit screen: QR, address box with Copy, network note. */
export function ReceiveScreen({navigation}: Props) {
  const {address, account, net} = useWallet();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!address) {
    return null;
  }

  return (
    <Screen
      footer={
        <Button
          title="Close"
          variant="dark"
          onPress={() => navigation.goBack()}
        />
      }>
      <View style={styles.qr}>
        <QRCode value={address} size={180} />
      </View>
      <View style={styles.addressBox}>
        <View style={styles.addressHeader}>
          <Text style={styles.accountName} numberOfLines={1}>
            {account?.name ?? 'Account'}
          </Text>
          <Pressable
            testID="receive-copy"
            accessibilityRole="button"
            onPress={() => {
              copyWithExpiry(address);
              setCopied(true);
            }}
            style={({pressed}) => [
              styles.copyButton,
              pressed && styles.copyButtonPressed,
            ]}>
            <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
          </Pressable>
        </View>
        {/* The full address: look-alike addresses share only the ends. */}
        <Address value={address} />
      </View>
      <Text style={styles.caption}>
        Only use this address to receive tokens on the{' '}
        <Text style={styles.captionStrong}>{net?.network.networkName}</Text>{' '}
        network. The clipboard is cleared {CLIPBOARD_CLEAR_MS / 1000} seconds
        after copying.
      </Text>
    </Screen>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  qr: {
    alignSelf: 'center',
    backgroundColor: neutral._1,
    padding: 10,
    borderRadius: 8,
    marginVertical: 24,
  },
  addressBox: {
    backgroundColor: neutral._9,
    borderWidth: 1,
    borderColor: neutral._7,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  accountName: {...fonts.body2Bold, color: colors.text, flexShrink: 1},
  copyButton: {
    height: 25,
    borderRadius: 12.5,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: neutral._7,
  },
  copyButtonPressed: {backgroundColor: neutral.b},
  copyText: {...fonts.body2Reg, lineHeight: 18, color: colors.text},
  caption: {
    ...fonts.captionReg,
    color: colors.textMuted,
    paddingHorizontal: 16,
  },
  captionStrong: {...fonts.captionBold, color: colors.text},
});
