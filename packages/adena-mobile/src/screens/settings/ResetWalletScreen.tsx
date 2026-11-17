import RemoveIcon from '@assets/icon-remove-blur.svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {useReauth} from '../../security/reauth';
import {Body, ButtonPair, Screen, Title} from '../../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'ResetWallet'>;

/** The popup's reset screen. Mobile asks for the password first. */
export function ResetWalletScreen({navigation}: Props) {
  const {resetWallet} = useWallet();
  const requestReauth = useReauth();

  const reset = async () => {
    if (await requestReauth('Confirm resetting this wallet')) {
      await resetWallet();
    }
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Reset',
            variant: 'danger',
            testID: 'reset-confirm',
            onPress: reset,
          }}
        />
      }>
      <View style={styles.body}>
        <RemoveIcon width={100} height={100} />
        <Title center>Reset Wallet</Title>
        <Body muted center>
          This will remove all accounts from this wallet. As your seed phrase
          and keys are only stored on this device, Adena cannot recover them
          once reset.
        </Body>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {alignItems: 'center', gap: 12, paddingTop: 36},
});
