import React, { ReactElement } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ButtonTone, Text } from '../../atoms';
import { styles } from './app-failure.styles';

export interface AppFailureAction {
  label: string;
  tone?: ButtonTone;
  onPress: () => void;
}

export interface AppFailurePageProps {
  title: string;
  description: string;
  actions?: AppFailureAction[];
}

// Shown when the app cannot boot or a screen crashed.
export const AppFailurePage = ({ title, description, actions = [] }: AppFailurePageProps): ReactElement => (
  <SafeAreaView style={styles.container}>
    <View style={styles.body}>
      <Text variant='section' align='center'>{title}</Text>
      <Text variant='meta' color='secondary' align='center'>{description}</Text>
    </View>
    {actions.length > 0 && (
      <View style={styles.actions}>
        {actions.map(action => (
          <Button key={action.label} label={action.label} tone={action.tone} onPress={action.onPress} fullWidth />
        ))}
      </View>
    )}
  </SafeAreaView>
);
