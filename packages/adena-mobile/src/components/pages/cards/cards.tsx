import React, { ReactElement } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRefreshControlColors } from '../../../theme';
import { Button, Icon, Skeleton, Text } from '../../atoms';
import { BottomSheet, EmptyState, InlineAlert, ListRow, TopBar, useFloatingNavigationClearance } from '../../molecules';
import { OrderRowView, SessionCardRowView } from '../../view-models';
import { CardReviewSheet, CardReviewSheetProps } from './card-review-sheet';
import { useStyles } from './cards.styles';

export interface CardsPageProps {
  // False on networks without session accounts.
  supported: boolean;
  loading: boolean;
  error?: string;
  cards: SessionCardRowView[];
  notice?: string;
  refreshing: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onOpenCard: (id: string) => void;
  onRevokeCard: (id: string) => void;
  onRevokeAll: () => void;
  // Card whose revoke review is being prepared.
  preparingId?: string;
  revoke: CardReviewSheetProps;
  // GnoSwap orders, on networks with the order protocol.
  ordersSupported: boolean;
  ordersLoading: boolean;
  ordersError?: string;
  orders: OrderRowView[];
  onOpenOrder: (id: string) => void;
  chooserVisible: boolean;
  onOpenChooser: () => void;
  onCloseChooser: () => void;
  onCreateDca: () => void;
  onCreateLimit: () => void;
}

interface SessionCardTileProps {
  card: SessionCardRowView;
  revoking: boolean;
  onOpen: (id: string) => void;
  onRevoke: (id: string) => void;
}

// Dark card: what an issued session may still spend, and the way to end it.
const SessionCardTile = ({ card, revoking, onOpen, onRevoke }: SessionCardTileProps): ReactElement => {
  const styles = useStyles();
  const handleOpen = (): void => onOpen(card.id);
  const handleRevoke = (): void => onRevoke(card.id);

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${card.name}, ${card.usedAmount} ${card.limitLabel} used, ${card.timeLeftLabel}`}
      onPress={handleOpen}
      style={({ pressed }) => [styles.darkCard, pressed && styles.darkCardPressed]}
      testID={`card-row-${card.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}><Text variant='row' style={styles.avatarText}>{card.initial}</Text></View>
        <View style={styles.cardTitle}>
          <Text variant='row' numberOfLines={1} style={styles.onDark}>{card.name}</Text>
          <Text variant='meta' numberOfLines={1} style={styles.onDarkMuted}>{card.kindLabel}</Text>
        </View>
        <View style={styles.timePill}>
          <Icon name='clock' size={14} color={styles.onDark.color} />
          <Text variant='meta' style={styles.onDark}>{card.timeLeftLabel}</Text>
        </View>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.bigAmount} tabular>{card.usedAmount}</Text>
        <Text variant='row' style={styles.onDarkMuted}>{card.limitLabel}</Text>
        <Text variant='meta' style={[styles.onDarkMuted, styles.pushRight]}>{card.periodLabel}</Text>
      </View>
      <View style={styles.darkTrack}>
        <View style={[styles.darkFill, { width: `${Math.round(Math.min(card.ratio, 1) * 100)}%` }]} />
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.where}>
          <Icon name='pin' size={16} color={styles.onDarkMuted.color} />
          <Text variant='meta' numberOfLines={1} style={[styles.onDarkMuted, styles.whereText]}>{card.whereLabel}</Text>
        </View>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={`Revoke ${card.name}`}
          disabled={revoking}
          onPress={handleRevoke}
          style={({ pressed }) => [styles.revokePill, pressed && styles.revokePillPressed]}
          testID={`card-revoke-${card.id}`}
        >
          <Text variant='button'>{revoking ? '…' : 'Revoke'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

// Light card: an escrowed order and how far GnoSwap has run it.
const OrderTile = ({ order, onOpen }: { order: OrderRowView; onOpen: (id: string) => void }): ReactElement => {
  const styles = useStyles();
  const handleOpen = (): void => onOpen(order.id);
  const done = order.segments?.done ?? 0;

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${order.title}, ${order.pillLabel}, ${order.footerRight}`}
      onPress={handleOpen}
      style={({ pressed }) => [styles.lightCard, pressed && styles.lightCardPressed]}
      testID={`order-row-${order.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}><Icon name={order.kind === 'dca' ? 'repeat' : 'swap'} size={20} /></View>
        <View style={styles.cardTitle}>
          <Text variant='row' numberOfLines={1}>{order.title}</Text>
          <Text variant='meta' color='secondary' numberOfLines={1}>{order.subtitle}</Text>
        </View>
        <View style={styles.countPill}><Text variant='meta' style={styles.bold}>{order.pillLabel}</Text></View>
      </View>
      {order.segments
        ? (
            <View style={styles.segments}>
              {Array.from({ length: order.segments.total }, (_, index) => (
                <View key={index} style={[styles.segment, index < done && styles.segmentDone]} />
              ))}
            </View>
          )
        : (
            <View style={styles.lightTrack}>
              <View style={[styles.lightFill, { width: `${Math.round(order.progress * 100)}%` }]} />
            </View>
          )}
      <View style={styles.orderFooter}>
        <Text variant='meta' color='secondary'>{order.footerLeft}</Text>
        <Text variant='meta' color={order.claimable ? 'success' : 'secondary'}>{order.footerRight}</Text>
      </View>
    </Pressable>
  );
};

export const CardsPage = ({
  supported,
  loading,
  error,
  cards,
  notice,
  refreshing,
  onRefresh,
  onCreate,
  onOpenCard,
  onRevokeCard,
  onRevokeAll,
  preparingId,
  revoke,
  ordersSupported,
  ordersLoading,
  ordersError,
  orders,
  onOpenOrder,
  chooserVisible,
  onOpenChooser,
  onCloseChooser,
  onCreateDca,
  onCreateLimit,
}: CardsPageProps): ReactElement => {
  const styles = useStyles();
  const refreshColors = useRefreshControlColors();
  const bottomClearance = useFloatingNavigationClearance();
  const handleNew = ordersSupported ? onOpenChooser : onCreate;

  const handleChooseCard = (): void => {
    onCloseChooser();
    onCreate();
  };

  const handleChooseDca = (): void => {
    onCloseChooser();
    onCreateDca();
  };

  const handleChooseLimit = (): void => {
    onCloseChooser();
    onCreateLimit();
  };

  const renderList = (): ReactElement => {
    if (loading) {
      return (
        <View style={styles.list}>
          <Skeleton height={220} />
          <Skeleton height={140} />
        </View>
      );
    }

    if (error) {
      return <InlineAlert tone='error' title='Could not load cards' description={error} />;
    }

    if (cards.length === 0 && (!ordersSupported || (!ordersLoading && !ordersError && orders.length === 0))) {
      return (
        <EmptyState
          title='Nothing is working for you yet'
          description='Hand off a job with a limit you set: a card for an app or agent, or a recurring buy or limit order on GnoSwap. The chain enforces the limit.'
          actionLabel='New'
          onAction={handleNew}
        />
      );
    }

    return (
      <View style={styles.list}>
        {notice && <InlineAlert tone='warning' title={notice} />}
        {cards.map(card => <SessionCardTile key={card.id} card={card} revoking={preparingId === card.id} onOpen={onOpenCard} onRevoke={onRevokeCard} />)}
        {ordersLoading && <Skeleton height={140} />}
        {ordersError && <InlineAlert tone='error' title='Could not load orders' description={ordersError} />}
        {orders.map(order => <OrderTile key={order.id} order={order} onOpen={onOpenOrder} />)}
        {cards.length > 1 && <Button label='Revoke all cards' tone='destructiveText' onPress={onRevokeAll} testID='cards-revoke-all' />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar
        title='Working for you'
        trailing={supported
          ? (
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Create'
                onPress={handleNew}
                style={({ pressed }) => [styles.newPill, pressed && styles.newPillPressed]}
                testID='cards-new'
              >
                <Icon name='plus' size={18} />
                <Text variant='button'>New</Text>
              </Pressable>
            )
          : undefined}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        keyboardShouldPersistTaps='handled'
        refreshControl={supported ? <RefreshControl {...refreshColors} refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {supported
          ? renderList()
          : <EmptyState title='Cards are not available here' description='Switch to a Gno.land network to issue cards.' />}
      </ScrollView>
      <CardReviewSheet {...revoke} />
      <BottomSheet visible={chooserVisible} title='What should run for you?' onClose={onCloseChooser}>
        <ListRow label='Card' description='Let an app or agent act for you, within a limit' leadingIcon='card' showChevron onPress={handleChooseCard} testID='create-card' />
        <ListRow label='Recurring buy' description='Buy a token on a schedule' leadingIcon='repeat' showChevron onPress={handleChooseDca} testID='create-dca' />
        <ListRow label='Limit order' description='Sell when the price reaches your target' leadingIcon='swap' showChevron onPress={handleChooseLimit} testID='create-limit' />
      </BottomSheet>
    </SafeAreaView>
  );
};
