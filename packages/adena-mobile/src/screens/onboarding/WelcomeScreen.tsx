import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';

import type {OnboardingStackParams} from '../../navigation/types';
import {Body, Button, Notice, Screen, Title} from '../../ui/components';

type Props = NativeStackScreenProps<OnboardingStackParams, 'Welcome'>;

export function WelcomeScreen({navigation}: Props) {
  return (
    <Screen topInset>
      <Title>Adena</Title>
      <Body muted>A self-custody wallet for gno.land.</Body>
      <Notice>
        Adena will never ask for your recovery phrase. Anyone who asks for it,
        in an app, a website or a message, is trying to take your funds.
      </Notice>
      <Button
        title="Create a new wallet"
        onPress={() => navigation.navigate('CreateMnemonic')}
      />
      <Button
        title="Import with a recovery phrase"
        variant="secondary"
        onPress={() => navigation.navigate('ImportWallet')}
      />
    </Screen>
  );
}
