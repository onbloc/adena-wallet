import React, { PropsWithChildren, ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { useStyles } from './card.styles';

export interface CardProps {
  title?: string;
  description?: string;
}

// 16px radius / 16px padding with an editable content slot.
export const Card = ({ title, description, children }: PropsWithChildren<CardProps>): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      {title && <Text variant='section'>{title}</Text>}
      {description && <Text variant='meta' color='secondary'>{description}</Text>}
      {children && <View style={styles.slot}>{children}</View>}
    </View>
  );
};
