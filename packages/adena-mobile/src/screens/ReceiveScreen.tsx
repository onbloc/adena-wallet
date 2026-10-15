import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {useWallet} from '../core/wallet-context';
import {
  CLIPBOARD_CLEAR_MS,
  copyWithExpiry,
} from '../security/sensitive-clipboard';
import {Address} from '../ui/address';
import {Body, Button, Screen, Title} from '../ui/components';

export function ReceiveScreen() {
  const {address, net} = useWallet();
  const [copied, setCopied] = useState(false);

  if (!address) {
    return null;
  }

  return (
    <Screen>
      <Title>Receive</Title>
      <Body muted>
        Only send {net?.network.networkName} assets to this address.
      </Body>
      <View style={styles.qr}>
        <QRCode value={address} size={220} />
      </View>
      <Address value={address} />
      <Button
        title={copied ? 'Copied' : 'Copy address'}
        variant="secondary"
        onPress={() => {
          copyWithExpiry(address);
          setCopied(true);
        }}
      />
      {copied && (
        <Body muted>
          The clipboard is cleared after {CLIPBOARD_CLEAR_MS / 1000} seconds.
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qr: {alignItems: 'center', paddingVertical: 16},
});
