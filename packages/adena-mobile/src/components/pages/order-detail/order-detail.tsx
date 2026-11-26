import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Skeleton, Text } from '../../atoms';
import { Card, EmptyState, InlineAlert, KeyValueRow, Screen, TopBar } from '../../molecules';
import { OrderDetailView } from '../../view-models';
import { CardReviewSheet, CardReviewSheetProps } from '../cards/card-review-sheet';
import { useStyles } from './order-detail.styles';

export interface OrderDetailPageProps {
  order?: OrderDetailView;
  loading: boolean;
  // Settled: filled, cancelled, expired and refunded, or fully claimed.
  missing: boolean;
  error?: string;
  onBack: () => void;
  onClaim: () => void;
  onCancel: () => void;
  preparing: boolean;
  review: CardReviewSheetProps;
}

export const OrderDetailPage = ({ order, loading, missing, error, onBack, onClaim, onCancel, preparing, review }: OrderDetailPageProps): ReactElement => {
  const styles = useStyles();
  const header = <TopBar title={order?.title ?? 'Order'} onBack={onBack} />;

  if (loading) {
    return (
      <Screen header={header}>
        <View style={styles.body}>
          <Skeleton height={96} />
          <Skeleton height={200} />
        </View>
      </Screen>
    );
  }

  if (missing || !order) {
    return (
      <Screen header={header}>
        {error
          ? <InlineAlert tone='error' title='Could not load the order' description={error} />
          : <EmptyState title='This order is settled' description='It was completed, cancelled or refunded. Check Activity for the details.' actionLabel='Back to cards' onAction={onBack} />}
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={(
        <View style={styles.footer}>
          {order.canClaim && <Button label='Claim' loading={preparing} loadingLabel='Preparing…' onPress={onClaim} testID='order-claim' />}
          <Button label='Cancel order' tone='destructiveOutline' disabled={preparing} onPress={onCancel} testID='order-cancel' />
          <Text variant='meta' color='secondary' align='center'>{order.cancelDescription}</Text>
        </View>
      )}
    >
      <View style={styles.body}>
        {error && <InlineAlert tone='error' title={error} />}
        <Card title={order.progressLabel} description={order.statusLabel}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(order.progress * 100)}%` }]} />
          </View>
        </Card>
        <View style={styles.rows}>
          {order.rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} emphasis={row.emphasis} />)}
        </View>
        {order.notes.map(note => <Text key={note} variant='meta' color='secondary'>{note}</Text>)}
      </View>
      <CardReviewSheet {...review} />
    </Screen>
  );
};
