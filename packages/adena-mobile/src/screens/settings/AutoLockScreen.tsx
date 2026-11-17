import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {
  effectiveAutoLockMinutes,
  MAX_AUTO_LOCK_MINUTES,
} from '../../platform/auto-lock';
import {Body, ListItem, Screen} from '../../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'AutoLock'>;

const CHOICES = [1, 5, MAX_AUTO_LOCK_MINUTES];

export function AutoLockScreen({navigation}: Props) {
  const {base} = useWallet();
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    base.walletService
      .getAutoLockTimeoutMinutes()
      .then(minutes => setCurrent(effectiveAutoLockMinutes(minutes)));
  }, [base]);

  const choose = async (minutes: number) => {
    await base.walletService.updateAutoLockTimeoutMinutes(minutes);
    setCurrent(minutes);
    navigation.goBack();
  };

  return (
    <Screen>
      <Body muted>
        Adena locks itself after this long without activity, and whenever it
        moves to the background.
      </Body>
      {CHOICES.map(minutes => (
        <ListItem
          key={minutes}
          title={`${minutes} minute${minutes === 1 ? '' : 's'}`}
          selected={current === minutes}
          onPress={() => choose(minutes)}
        />
      ))}
    </Screen>
  );
}
