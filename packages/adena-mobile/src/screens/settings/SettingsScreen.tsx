import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Divider, ListItem, Screen} from '../../ui/components';
import {LockIcon, MapRouteIcon, SecurityIcon} from '../../ui/icons';

type Props = NativeStackScreenProps<MainStackParams, 'Settings'>;

/** The popup settings menu, limited to what the mobile app supports so far. */
export function SettingsScreen({navigation}: Props) {
  const {net, lock} = useWallet();

  return (
    <Screen>
      <ListItem
        testID="settings-lock"
        icon={<LockIcon />}
        title="Lock Wallet"
        chevron={false}
        onPress={lock}
      />
      <Divider />
      <ListItem
        icon={<MapRouteIcon />}
        title="Change Network"
        detail={net?.network.networkName}
        onPress={() => navigation.navigate('Networks')}
      />
      <ListItem
        testID="settings-security"
        icon={<SecurityIcon />}
        title="Security & Privacy"
        onPress={() => navigation.navigate('Security')}
      />
    </Screen>
  );
}
