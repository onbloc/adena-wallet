import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { Screen, TopBar } from '../../molecules';
import { styles } from './connected-apps.styles';

export interface ConnectedAppItem {
  origin: string;
  name: string;
  detail: string;
}

export interface ConnectedAppsPageProps {
  apps: ConnectedAppItem[];
  onDisconnect: (origin: string) => void;
  onBack: () => void;
}

export const ConnectedAppsPage = ({ apps, onDisconnect, onBack }: ConnectedAppsPageProps): ReactElement => (
  <Screen header={<TopBar title='Connected apps' onBack={onBack} />}>
    <Text variant='section'>{`${apps.length} connected apps`}</Text>
    <Text variant='meta' color='secondary'>Manage access to Adena wallet. Disconnecting ends the active connection.</Text>
    {apps.map((app) => {
      const handlePress = (): void => onDisconnect(app.origin);

      return (
        <View key={app.origin} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.texts}>
              <Text variant='row'>{app.name}</Text>
              <Text variant='meta' color='secondary'>{app.origin}</Text>
            </View>
            <Button label='Disconnect' tone='tertiary' size='compact' fullWidth={false} onPress={handlePress} />
          </View>
          <Text variant='meta' color='secondary'>{app.detail}</Text>
        </View>
      );
    })}
  </Screen>
);
