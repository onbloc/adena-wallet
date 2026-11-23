import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { ConnectedAppsPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';

export const ConnectedAppsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'ConnectedApps'>): ReactElement => {
  const { connectedAppService } = useContainer();
  const { accounts, networks } = useWalletSnapshot();
  const [apps, setApps] = useState(() => connectedAppService.getConnectedApps());

  const handleDisconnect = (origin: string): void => {
    connectedAppService.disconnect(origin);
    setApps(connectedAppService.getConnectedApps());
  };

  return (
    <ConnectedAppsPage
      apps={apps.map(app => ({
        origin: app.origin,
        name: app.name,
        detail: [
          networks.find(network => network.id === app.networkId)?.networkName ?? app.networkId,
          accounts.find(account => account.id === app.accountId)?.name ?? 'Removed account',
        ].join(' · '),
      }))}
      onDisconnect={handleDisconnect}
      onBack={navigation.goBack}
    />
  );
};
