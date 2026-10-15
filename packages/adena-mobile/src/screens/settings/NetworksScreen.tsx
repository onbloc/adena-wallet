import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Body, Button, Screen, Title} from '../../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'Networks'>;

export function NetworksScreen({navigation}: Props) {
  const {networks, net, switchNetwork} = useWallet();
  const visible = networks.filter(network => !network.deleted);

  return (
    <Screen>
      <Title>Network</Title>
      {visible.length === 0 && <Body muted>No networks are configured.</Body>}
      {visible.map(network => (
        <Button
          key={network.id}
          title={`${network.networkName} (${network.chainId})`}
          variant={network.id === net?.network.id ? 'primary' : 'secondary'}
          onPress={async () => {
            await switchNetwork(network.id);
            navigation.goBack();
          }}
        />
      ))}
    </Screen>
  );
}
