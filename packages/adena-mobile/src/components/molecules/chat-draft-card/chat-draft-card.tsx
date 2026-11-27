import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Text } from '../../atoms';
import { ChatDraftView } from '../../view-models';
import { KeyValueRow } from '../key-value-row';
import { useStyles } from './chat-draft-card.styles';

export interface ChatDraftCardProps {
  draft: ChatDraftView;
  onReview: () => void;
  onDismiss: () => void;
}

// A transaction the assistant prepared; nothing is signed until the user reviews and confirms.
export const ChatDraftCard = ({ draft, onReview, onDismiss }: ChatDraftCardProps): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.card} testID={`chat-draft-${draft.id}`}>
      <Text variant='row'>{draft.title}</Text>
      <View style={styles.rows}>
        {draft.rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline={row.multiline} />)}
      </View>
      {draft.state === 'pending' && (
        <View style={styles.actions}>
          <Button label='Review' size='compact' style={styles.action} onPress={onReview} testID={`chat-draft-review-${draft.id}`} />
          <Button label='Dismiss' tone='tertiary' size='compact' style={styles.action} onPress={onDismiss} testID={`chat-draft-dismiss-${draft.id}`} />
        </View>
      )}
      {draft.state === 'sent' && <Badge label='Sent' tone='success' />}
      {draft.state === 'dismissed' && <Text variant='meta' color='disabled'>Dismissed</Text>}
    </View>
  );
};
