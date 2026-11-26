import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Skeleton, Text } from '../../atoms';
import { Card, EmptyState, InlineAlert, KeyValueRow, Screen, SpendMeter, TopBar } from '../../molecules';
import { SessionCardDetailView } from '../../view-models';
import { CardReviewSheet, CardReviewSheetProps } from '../cards/card-review-sheet';
import { useStyles } from './card-detail.styles';

export interface CardDetailPageProps {
  card?: SessionCardDetailView;
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

const List = ({ items }: { items: string[] }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.items}>
      {items.map(item => <Text key={item} variant='body' selectable>{item}</Text>)}
    </View>
  );
};

export const CardDetailPage = ({ card, loading, missing, error, onBack, onCopyAddress, onRevoke, preparingRevoke, revoke }: CardDetailPageProps): ReactElement => {
  const styles = useStyles();
  const header = <TopBar title={card?.name ?? 'Card'} onBack={onBack} trailing={card?.expired ? <Badge label='Expired' /> : undefined} />;

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
      footer={(
        <Button
          label='Revoke card'
          tone='destructiveOutline'
          loading={preparingRevoke}
          loadingLabel='Preparing…'
          onPress={onRevoke}
          testID='card-revoke'
        />
      )}
    >
      <View style={styles.body}>
        {error && <InlineAlert tone='error' title={error} />}
        <Card title='Spent'>
          <SpendMeter ratio={card.ratio} usedLabel={card.usedLabel} limitLabel={card.limitLabel} caption={card.usageCaption} />
        </Card>
        <Card title='Where'>
          <List items={card.where} />
        </Card>
        <View style={styles.rows}>
          <KeyValueRow label='Limit' value={card.limitRow} multiline />
          <KeyValueRow label='Until' value={card.untilRow} multiline />
          <KeyValueRow label='Card address' value={card.address} multiline onCopy={onCopyAddress} copyLabel='Copy card address' />
        </View>
        <Card title='It can never'>
          <List items={card.restrictions} />
        </Card>
        {card.issuedElsewhere && (
          <InlineAlert
            tone='info'
            title='Issued elsewhere'
            description='Another wallet or device issued this card, so its key is not on this phone.'
          />
        )}
      </View>
      <CardReviewSheet {...revoke} />
    </Screen>
  );
};
