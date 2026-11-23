import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { NetworksPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';

export const NetworksScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Networks'>): ReactElement => {
  const { networkService } = useContainer();
  const { networks, network: current } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);

  const handleSelect = (networkId: string): void => {
    networkService.selectNetwork(networkId);
    bumpRevision();
    navigation.goBack();
  };

  const handleRemove = (networkId: string): void => {
    networkService.removeCustomNetwork(networkId);
    bumpRevision();
  };

  const handleAddNetwork = (): void => navigation.navigate('AddNetwork');

  return (
    <NetworksPage
      networks={networks.map(network => ({
        id: network.id,
        name: network.networkName,
        detail: `${network.chainName} · ${network.chainId}`,
        selected: network.id === current.id,
        isCustom: network.isCustom,
        isTestnet: !network.isMainnet,
      }))}
      onSelect={handleSelect}
      onRemove={handleRemove}
      onAddNetwork={handleAddNetwork}
      onBack={navigation.goBack}
    />
  );
};
