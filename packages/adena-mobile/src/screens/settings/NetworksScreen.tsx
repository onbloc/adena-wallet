import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Body, ListItem, Screen} from '../../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'Networks'>;

/** The popup's change-network list: one row per network, a check on the current one. */
export function NetworksScreen({navigation}: Props) {
  const {networks, net, switchNetwork} = useWallet();
  const visible = networks.filter(network => !network.deleted);

  return (
    <Screen>
      {visible.length === 0 && <Body muted>No networks available</Body>}
      {visible.map(network => (
        <ListItem
          key={network.id}
          title={network.networkName}
          detail={network.chainId}
          selected={network.id === net?.network.id}
          onPress={async () => {
            await switchNetwork(network.id);
            navigation.goBack();
          }}
        />
      ))}
    </Screen>
  );
}
