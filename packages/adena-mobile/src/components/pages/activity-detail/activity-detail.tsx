import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Text, TextColor } from '../../atoms';
import { Card, KeyValueRow, Screen, TopBar } from '../../molecules';
import { styles } from './activity-detail.styles';

export interface ActivityDetailPageProps {
  title: string;
  amountLabel?: string;
  amountColor: TextColor;
  status: 'Confirmed' | 'Failed';
  // Truncated values carry `onCopy` so the full string stays reachable.
  rows: { label: string; value: string; multiline?: boolean; onCopy?: () => void; copyLabel?: string }[];
  onOpenExplorer?: () => void;
  // e.g. "Gnoscan" or "Mintscan".
  explorerName?: string;
  onBack: () => void;
}

export const ActivityDetailPage = ({ title, amountLabel, amountColor, status, rows, onOpenExplorer, explorerName = 'explorer', onBack }: ActivityDetailPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Activity detail' onBack={onBack} />}
    footer={onOpenExplorer && <Button label={`View on ${explorerName}`} tone='secondary' trailingIcon='chevronRight' onPress={onOpenExplorer} />}
  >
    <View style={styles.hero}>
      <Badge label={status} tone={status === 'Confirmed' ? 'success' : 'error'} />
      <Text variant='section'>{title}</Text>
      {amountLabel && <Text variant='display' tabular color={amountColor} adjustsFontSizeToFit numberOfLines={1}>{amountLabel}</Text>}
    </View>
    <Card>
      {rows.map(row => <KeyValueRow key={row.label} {...row} />)}
    </Card>
  </Screen>
);
