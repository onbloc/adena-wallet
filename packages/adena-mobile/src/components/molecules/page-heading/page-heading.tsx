import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { styles } from './page-heading.styles';

export interface PageHeadingProps {
  // Uppercase step label above the title, e.g. "IMPORT / RECOVERY PHRASE".
  eyebrow?: string;
  title: string;
  description?: string;
}

export const PageHeading = ({ eyebrow, title, description }: PageHeadingProps): ReactElement => (
  <View style={styles.root}>
    {eyebrow && <Text variant='meta' color='secondary' style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>}
    <Text variant='display' accessibilityRole='header'>{title}</Text>
    {description && <Text variant='body' color='secondary'>{description}</Text>}
  </View>
);
