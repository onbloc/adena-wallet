import React, { ReactElement } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRefreshControlColors } from '../../../theme';
import { Badge, Button, Icon, IconButton, Skeleton, Text } from '../../atoms';
import { BottomSheet, EmptyState, InlineAlert, ListRow, SectionLabel, SpendMeter, TopBar, useFloatingNavigationClearance } from '../../molecules';
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
  onRevokeAll: () => void;
  preparingRevokeAll: boolean;
  revokeAll: CardReviewSheetProps;
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

const OrderRow = ({ order, onPress }: { order: OrderRowView; onPress: () => void }): ReactElement => {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${order.title}, ${order.progressLabel}, ${order.statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`order-row-${order.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}><Icon name={order.kind === 'dca' ? 'activity' : 'swap'} size={20} /></View>
        <View style={styles.cardTitle}>
          <Text variant='row' numberOfLines={1}>{order.title}</Text>
          <Text variant='meta' color='secondary' numberOfLines={1}>{order.subtitle}</Text>
        </View>
        {order.claimLabel && <Badge label='Claim' tone='success' />}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(order.progress * 100)}%` }]} />
      </View>
      <View style={styles.orderFooter}>
        <Text variant='meta' color='secondary'>{order.progressLabel}</Text>
        <Text variant='meta' color='secondary'>{order.claimLabel ?? order.statusLabel}</Text>
      </View>
    </Pressable>
  );
};

const CardRow = ({ card, onPress }: { card: SessionCardRowView; onPress: () => void }): ReactElement => {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${card.name}, ${card.usedLabel} of ${card.limitLabel} used, ${card.timeLeftLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`card-row-${card.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}><Icon name='card' size={20} /></View>
        <View style={styles.cardTitle}>
          <Text variant='row' numberOfLines={1}>{card.name}</Text>
          <Text variant='meta' color='secondary' numberOfLines={1}>{card.whereLabel}</Text>
        </View>
        {card.expired ? <Badge label='Expired' tone='neutral' /> : <Text variant='meta' color='secondary'>{card.timeLeftLabel}</Text>}
      </View>
      <SpendMeter ratio={card.ratio} usedLabel={card.usedLabel} limitLabel={card.limitLabel} />
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
  onRevokeAll,
  preparingRevokeAll,
  revokeAll,
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

  const renderCards = (): ReactElement => {
    if (loading) {
      return (
        <View style={styles.list}>
          <Skeleton height={112} />
          <Skeleton height={112} />
        </View>
      );
    }

    if (error) {
      return <InlineAlert tone='error' title='Could not load cards' description={error} />;
    }

    if (cards.length === 0) {
      return (
        <EmptyState
          title='No cards yet'
          description='A card lets an app or agent act for you, only where you allow and only up to the limit you set. The chain enforces it.'
          actionLabel='New card'
          onAction={onCreate}
        />
      );
    }

    return (
      <View style={styles.list}>
        {notice && <InlineAlert tone='warning' title={notice} />}
        {cards.map((card) => {
          const handlePress = (): void => onOpenCard(card.id);

          return <CardRow key={card.id} card={card} onPress={handlePress} />;
        })}
        <Button label='Revoke all cards' tone='destructiveText' loading={preparingRevokeAll} loadingLabel='Preparing…' onPress={onRevokeAll} testID='cards-revoke-all' />
      </View>
    );
  };

  const renderOrders = (): ReactElement => {
    if (ordersLoading) {
      return <Skeleton height={96} />;
    }

    if (ordersError) {
      return <InlineAlert tone='error' title='Could not load orders' description={ordersError} />;
    }

    if (orders.length === 0) {
      return <Text variant='meta' color='secondary'>Recurring buys and limit orders you place on GnoSwap show up here.</Text>;
    }

    return (
      <View style={styles.list}>
        {orders.map((order) => {
          const handlePress = (): void => onOpenOrder(order.id);

          return <OrderRow key={order.id} order={order} onPress={handlePress} />;
        })}
      </View>
    );
  };

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

  const renderBody = (): ReactElement => {
    if (!supported) {
      return <EmptyState title='Cards are not available here' description='Switch to a Gno.land network to issue cards.' />;
    }

    return (
      <View style={styles.sections}>
        <View style={styles.list}>
          <SectionLabel label='Cards' />
          {renderCards()}
        </View>
        {ordersSupported && (
          <View style={styles.list}>
            <SectionLabel label='Orders' />
            {renderOrders()}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar
        title='Cards'
        trailing={supported ? <IconButton icon='plus' accessibilityLabel='Create' onPress={ordersSupported ? onOpenChooser : onCreate} testID='cards-new' /> : undefined}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        keyboardShouldPersistTaps='handled'
        refreshControl={supported ? <RefreshControl {...refreshColors} refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {renderBody()}
      </ScrollView>
      <CardReviewSheet {...revokeAll} />
      <BottomSheet visible={chooserVisible} title='Create' onClose={onCloseChooser}>
        <ListRow label='New card' description='Let an app or agent act for you within limits' leadingIcon='card' showChevron onPress={handleChooseCard} testID='create-card' />
        <ListRow label='Recurring buy' description='Buy a token on a schedule (DCA)' leadingIcon='activity' showChevron onPress={handleChooseDca} testID='create-dca' />
        <ListRow label='Limit order' description='Sell when the price reaches your target' leadingIcon='swap' showChevron onPress={handleChooseLimit} testID='create-limit' />
      </BottomSheet>
    </SafeAreaView>
  );
};
