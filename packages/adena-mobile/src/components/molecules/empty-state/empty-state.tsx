import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { styles } from './empty-state.styles';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps): ReactElement => (
  <View style={styles.box}>
    <Text variant='row' align='center'>{title}</Text>
    {description && <Text variant='meta' color='secondary' align='center'>{description}</Text>}
    {actionLabel && onAction && <Button label={actionLabel} tone='secondary' size='compact' fullWidth={false} onPress={onAction} />}
  </View>
);
