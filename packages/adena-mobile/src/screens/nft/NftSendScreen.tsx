import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {isAddressForNetwork} from '../../core/address';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {ButtonPair, Screen} from '../../ui/components';
import {MemoField} from '../../ui/memo-field';
import {NftImage} from '../../ui/nft';
import {RecipientField} from '../../ui/recipient-field';
import {colors, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'NftSend'>;

/** The extension's NFT transfer input: the token, recipient and memo. */
export function NftSendScreen({navigation, route}: Props) {
  const {token} = route.params;
  const {net, address} = useWallet();
  const [to, setTo] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanned = route.params.scannedAddress;
    if (scanned) {
      setTo(scanned);
    }
  }, [route.params.scannedAddress]);

  const next = () => {
    const recipient = to.trim();
    if (!isAddressForNetwork(recipient, net?.network.addressPrefix ?? 'g')) {
      setError('Invalid address');
      return;
    }
    if (recipient === address) {
      setError('This is your own address.');
      return;
    }
    navigation.navigate('SendConfirm', {
      kind: 'nft',
      to: recipient,
      token,
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
            testID: 'nft-send-next',
            disabled: !to,
            onPress: next,
          }}
        />
      }>
      <View style={styles.image}>
        <NftImage token={token} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {token.name} #{token.tokenId}
      </Text>
      <RecipientField
        value={to}
        onChange={text => {
          setTo(text);
          setError(null);
        }}
        error={error}
        onScan={() => navigation.navigate('QrScan', {returnTo: 'NftSend'})}
      />
      <MemoField value={memo} onChange={setMemo} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 14,
  },
  name: {...fonts.body1Bold, color: colors.text, textAlign: 'center'},
});
