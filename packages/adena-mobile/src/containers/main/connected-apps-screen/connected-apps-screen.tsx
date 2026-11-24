import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { ConnectedAppsPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { ConnectedApp } from '../../../domain/dapp';
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

  const describe = (app: ConnectedApp): string => [
    networks.find(network => network.id === app.networkId)?.networkName ?? app.networkId,
    accounts.find(account => account.id === app.accountId)?.name ?? 'Removed account',
  ].join(' · ');

  // One row per origin: an origin is stored per account and network, and Disconnect revokes all of them.
  const origins = [...new Set(apps.map(app => app.origin))];
  const items = origins.map((origin) => {
    const entries = apps.filter(app => app.origin === origin);

    return { origin, name: entries[0].name, detail: entries.map(describe).join('\n') };
  });

  return (
    <ConnectedAppsPage
      apps={items}
      onDisconnect={handleDisconnect}
      onBack={navigation.goBack}
    />
  );
};
