import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { StatusTone } from '../../../theme';
import { Badge, Button, Text } from '../../atoms';
import { ChatDraftState, ChatDraftView } from '../../view-models';
import { KeyValueRow } from '../key-value-row';
import { TokenImage } from '../token-image';
import { useStyles } from './chat-draft-card.styles';

export interface ChatDraftCardProps {
  draft: ChatDraftView;
  onReview: () => void;
  onDismiss: () => void;
  onViewActivity: () => void;
}

const OUTCOMES: Partial<Record<ChatDraftState, { label: string; tone: StatusTone }>> = {
  sent: { label: 'Sent', tone: 'success' },
  submitted: { label: 'Pending', tone: 'info' },
  unconfirmed: { label: 'Check Activity', tone: 'warning' },
};

// A transaction the assistant prepared; nothing is signed until the user reviews and confirms.
export const ChatDraftCard = ({ draft, onReview, onDismiss, onViewActivity }: ChatDraftCardProps): ReactElement => {
  const styles = useStyles();
  const outcome = OUTCOMES[draft.state];
  // A sent transfer needs no follow-up; an unsettled one points to Activity.
  const unsettled = draft.state === 'submitted' || draft.state === 'unconfirmed';

  return (
    <View style={styles.card} testID={`chat-draft-${draft.id}`}>
      <View style={styles.header}>
        <TokenImage symbol={draft.symbol} localIcon={draft.tokenLocalIcon} imageUrl={draft.tokenImageUrl} size={32} />
        <View style={styles.headerText}>
          <Text variant='row'>{draft.title}</Text>
          {draft.fiatLabel ? <Text variant='meta' color='secondary' tabular>{draft.fiatLabel}</Text> : null}
        </View>
      </View>
      <View style={styles.rows}>
        {draft.rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline={row.multiline} />)}
      </View>
      {draft.state === 'pending' && (
        <View style={styles.actions}>
          <Button label='Review' size='compact' style={styles.action} onPress={onReview} testID={`chat-draft-review-${draft.id}`} />
          <Button label='Dismiss' tone='tertiary' size='compact' style={styles.action} onPress={onDismiss} testID={`chat-draft-dismiss-${draft.id}`} />
        </View>
      )}
      {outcome && <Badge label={outcome.label} tone={outcome.tone} />}
      {draft.message ? <Text variant='meta' color='secondary'>{draft.message}</Text> : null}
      {unsettled && <Button label='View activity' tone='secondary' size='compact' onPress={onViewActivity} testID={`chat-draft-activity-${draft.id}`} />}
      {draft.state === 'dismissed' && <Text variant='meta' color='disabled'>Dismissed</Text>}
    </View>
  );
};
