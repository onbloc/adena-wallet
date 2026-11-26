import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Icon, Skeleton, Text } from '../../atoms';
import { EmptyState, InlineAlert, KeyValueRow, Screen, TopBar } from '../../molecules';
import { OrderDetailView } from '../../view-models';
import { FactTiles } from '../cards/card-parts';
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
  const header = <TopBar title={order?.row.kind === 'limit' ? 'Limit order' : 'Recurring buy'} onBack={onBack} />;

  if (loading) {
    return (
      <Screen header={header}>
        <View style={styles.body}>
          <Skeleton height={160} />
          <Skeleton height={120} />
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

  const { row } = order;
  const done = row.segments?.done ?? 0;

  return (
    <Screen
      header={header}
      footer={(
        <View style={styles.footerBlock}>
          <View style={styles.footer}>
            <Button
              label='Cancel order'
              tone={order.canClaim ? 'secondary' : 'primary'}
              fullWidth={false}
              disabled={preparing}
              onPress={onCancel}
              style={styles.footerButton}
              testID='order-cancel'
            />
            {order.canClaim && (
              <Button label='Claim' fullWidth={false} loading={preparing} loadingLabel='Preparing…' onPress={onClaim} style={styles.footerButton} testID='order-claim' />
            )}
          </View>
          <Text variant='meta' color='secondary' align='center'>{order.cancelDescription}</Text>
        </View>
      )}
    >
      <View style={styles.body}>
        {error && <InlineAlert tone='error' title={error} />}
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.iconCircle}><Icon name={row.kind === 'dca' ? 'repeat' : 'swap'} size={20} /></View>
            <View style={styles.heroTitle}>
              <Text variant='row'>{row.title}</Text>
              <Text variant='meta' color='secondary'>{row.subtitle}</Text>
            </View>
            <View style={styles.pill}><Text variant='meta' style={styles.bold}>{row.pillLabel}</Text></View>
          </View>
          {row.segments
            ? (
                <View style={styles.segments}>
                  {Array.from({ length: row.segments.total }, (_, index) => (
                    <View key={index} style={[styles.segment, index < done && styles.segmentDone]} />
                  ))}
                </View>
              )
            : (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(row.progress * 100)}%` }]} />
                </View>
              )}
          <View style={styles.heroFooter}>
            <Text variant='meta' color='secondary'>{row.footerLeft}</Text>
            <Text variant='meta' color={row.claimable ? 'success' : 'secondary'}>{row.footerRight}</Text>
          </View>
        </View>
        <FactTiles tiles={order.tiles} />
        {order.rows.length > 0 && (
          <View style={styles.rows}>
            {order.rows.map(item => <KeyValueRow key={item.label} label={item.label} value={item.value} emphasis={item.emphasis} />)}
          </View>
        )}
        {order.notes.map(note => (
          <View key={note} style={styles.note}>
            <Icon name='info' size={16} color={styles.noteGlyph.color} />
            <Text variant='meta' color='secondary' style={styles.noteText}>{note}</Text>
          </View>
        ))}
      </View>
      <CardReviewSheet {...review} />
    </Screen>
  );
};
