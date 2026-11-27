import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { Screen, TopBar } from '../../molecules';
import { useStyles } from './connected-apps.styles';

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

export const ConnectedAppsPage = ({ apps, onDisconnect, onBack }: ConnectedAppsPageProps): ReactElement => {
  const styles = useStyles();

  return (
    <Screen
      header={<TopBar title='Connected apps' onBack={onBack} />}
      footer={<Text variant='meta' color='secondary'>Disconnecting ends the active connection.</Text>}
    >
      <View style={styles.intro}>
        <Text variant='title'>{`${apps.length} connected ${apps.length === 1 ? 'app' : 'apps'}`}</Text>
        <Text variant='meta' color='secondary'>Manage access to Adena wallet.</Text>
      </View>
      <View style={styles.list}>
        {apps.map((app) => {
          const handlePress = (): void => onDisconnect(app.origin);

          return (
            <View key={app.origin} style={styles.card}>
              <View style={styles.header}>
                <View style={styles.texts}>
                  <Text variant='row'>{app.name}</Text>
                  <Text variant='meta' color='secondary'>{app.origin}</Text>
                </View>
                <Button label='Disconnect' tone='destructiveOutline' size='compact' fullWidth={false} onPress={handlePress} />
              </View>
              <Text variant='meta' color='secondary'>{app.detail}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
};
