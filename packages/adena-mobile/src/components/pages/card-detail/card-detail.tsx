import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Icon, IconButton, Skeleton, Text } from '../../atoms';
import { EmptyState, InlineAlert, Screen, TopBar } from '../../molecules';
import { SessionCardDetailView, SessionTaskView } from '../../view-models';
import { FactTiles, RestrictionChips } from '../cards/card-parts';
import { CardReviewSheet, CardReviewSheetProps } from '../cards/card-review-sheet';
import { useStyles } from './card-detail.styles';

export interface CardDetailPageProps {
  card?: SessionCardDetailView;
  // Sends the card signs by itself.
  tasks: SessionTaskView[];
  loading: boolean;
  // The chain no longer has the session (revoked, or never committed).
  missing: boolean;
  error?: string;
  onBack: () => void;
  onCopyAddress: () => void;
  onRevoke: () => void;
  preparingRevoke: boolean;
  revoke: CardReviewSheetProps;
}

export const CardDetailPage = ({ card, tasks, loading, missing, error, onBack, onCopyAddress, onRevoke, preparingRevoke, revoke }: CardDetailPageProps): ReactElement => {
  const styles = useStyles();
  const header = <TopBar title='Card' onBack={onBack} />;

  if (loading) {
    return (
      <Screen header={header}>
        <View style={styles.body}>
          <Skeleton height={220} />
          <Skeleton height={120} />
        </View>
      </Screen>
    );
  }

  if (missing || !card) {
    return (
      <Screen header={header}>
        {error
          ? <InlineAlert tone='error' title='Could not load the card' description={error} />
          : <EmptyState title='This card has ended' description='It was revoked or never reached the chain.' actionLabel='Back to cards' onAction={onBack} />}
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={<Button label='Revoke' loading={preparingRevoke} loadingLabel='Preparing…' onPress={onRevoke} testID='card-revoke' />}
    >
      <View style={styles.body}>
        {error && <InlineAlert tone='error' title={error} />}
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.avatar}><Text variant='row'>{card.initial}</Text></View>
            <View style={styles.heroTitle}>
              <Text variant='row' numberOfLines={1} style={styles.onDark}>{card.name}</Text>
              <Text variant='meta' numberOfLines={1} style={styles.onDarkMuted}>{card.kindLabel}</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, card.expired && styles.statusDotOff]} />
              <Text variant='meta' style={styles.onDark}>{card.expired ? 'Expired' : 'Active'}</Text>
            </View>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.bigAmount} tabular>{card.usedAmount}</Text>
            <Text variant='row' style={styles.onDarkMuted}>{card.limitLabel}</Text>
            <Text variant='meta' style={[styles.onDarkMuted, styles.pushRight]}>{card.periodLabel}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(Math.min(card.ratio, 1) * 100)}%` }]} />
          </View>
          <View style={styles.heroFooter}>
            <Text variant='meta' style={styles.onDarkMuted}>Network fees included</Text>
            {card.usageCaption && <Text variant='meta' style={styles.onDarkMuted}>{card.usageCaption}</Text>}
          </View>
        </View>
        <FactTiles
          tiles={[
            { icon: 'pin', label: 'Where', value: card.whereTile, caption: card.whereCaption },
            { icon: 'gauge', label: 'How much', value: card.limitTile, caption: card.limitCaption },
            { icon: 'clock', label: 'Until', value: card.untilTile, caption: card.untilCaption },
          ]}
        />
        <RestrictionChips items={card.restrictions} />
        <View style={styles.section}>
          <Text variant='meta' color='secondary' style={styles.sectionTitle}>Allowed</Text>
          <View style={styles.list}>
            {card.where.map((item, index) => (
              <View key={item} style={[styles.listRow, index > 0 && styles.listDivider]}>
                <View style={styles.listIcon}><Text variant='meta' style={styles.onDark}>G</Text></View>
                <Text variant='row' style={styles.listText} selectable>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        {tasks.length > 0 && (
          <View style={styles.section}>
            <Text variant='meta' color='secondary' style={styles.sectionTitle}>Sends by itself</Text>
            <View style={styles.list}>
              {tasks.map((task, index) => (
                <View key={task.id} style={[styles.listRow, index > 0 && styles.listDivider]}>
                  <View style={styles.taskIcon}><Icon name='arrowUp' size={18} /></View>
                  <Text variant='row' style={styles.listText}>{task.title}</Text>
                  <Badge label={task.statusLabel} tone={task.tone} />
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={styles.addressRow}>
          <View style={styles.listText}>
            <Text variant='meta' color='secondary'>Card address</Text>
            <Text variant='meta' selectable>{card.address}</Text>
          </View>
          <IconButton icon='copy' accessibilityLabel='Copy card address' onPress={onCopyAddress} />
        </View>
        {card.issuedElsewhere && (
          <InlineAlert tone='info' title='Issued elsewhere' description='Another wallet or device issued this card, so its key is not on this phone.' />
        )}
      </View>
      <CardReviewSheet {...revoke} />
    </Screen>
  );
};
