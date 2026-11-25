import React, { ReactElement } from 'react';
import { Linking } from 'react-native';

import { ExplorePage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainTabScreenProps } from '../../../navigation/screen-props';

export const ExploreScreen = (_props: MainTabScreenProps<'Explore'>): ReactElement => {
  const { exploreService } = useContainer();
  const { network } = useWalletSnapshot();
  const apps = exploreService.getApps(network);

  const handleOpenApp = (id: string): void => {
    const app = apps.find(item => item.id === id);

    if (app) {
      Linking.openURL(app.url);
    }
  };

  return (
    <ExplorePage
      apps={apps.map(app => ({ id: app.id, name: app.name, description: app.description, logo: app.logo, host: app.url.replace(/^https:\/\//, '').replace(/\/$/, '') }))}
      onOpenApp={handleOpenApp}
    />
  );
};
