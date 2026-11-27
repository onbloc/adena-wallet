import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Icon, Spinner, Text } from '../../atoms';
import { ChatDraftView, ChatMessageView, ChatToolView } from '../../view-models';
import { ChatDraftCard } from '../chat-draft-card';
import { InlineAlert } from '../inline-alert';
import { useStyles } from './chat-bubble.styles';

export interface ChatBubbleProps {
  message: ChatMessageView;
  onReviewDraft?: (draftId: string) => void;
  onDismissDraft?: (draftId: string) => void;
}

const ToolChip = ({ tool }: { tool: ChatToolView }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.tool} accessibilityLabel={`${tool.label}, ${tool.status}`}>
      {tool.status === 'running' && <Spinner size={14} tone='muted' />}
      {tool.status === 'done' && <Icon name='check' size={14} color={colors.status.success} />}
      {tool.status === 'error' && <Icon name='error' size={14} color={colors.status.error} />}
      <Text variant='meta' color='secondary'>{tool.label}</Text>
    </View>
  );
};

// User text on the right, assistant text on the left with tool activity, warnings, errors and draft cards beneath.
export const ChatBubble = ({ message, onReviewDraft, onDismissDraft }: ChatBubbleProps): ReactElement => {
  const styles = useStyles();
  const isUser = message.role === 'user';
  const hasBody = message.text.length > 0 || message.streaming;
  const handleReview = (draft: ChatDraftView): void => onReviewDraft?.(draft.id);
  const handleDismiss = (draft: ChatDraftView): void => onDismissDraft?.(draft.id);

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]} testID={`chat-bubble-${message.id}`}>
      {hasBody && (
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {message.text.length > 0
            ? <Text variant='body' color={isUser ? 'inverse' : 'primary'} selectable>{message.streaming ? `${message.text} ▍` : message.text}</Text>
            : <Text variant='body' color='secondary' accessibilityLabel='Assistant is typing' testID='chat-typing'>…</Text>}
        </View>
      )}
      {message.tools && message.tools.length > 0 && (
        <View style={styles.tools}>
          {message.tools.map(tool => <ToolChip key={tool.id} tool={tool} />)}
        </View>
      )}
      {(message.warnings?.length || message.error || message.drafts?.length)
        ? (
            <View style={styles.attachments}>
              {message.warnings?.map(warning => <InlineAlert key={warning} tone='warning' title={warning} />)}
              {message.drafts?.map(draft => (
                <ChatDraftCard
                  key={draft.id}
                  draft={draft}
                  onReview={() => handleReview(draft)}
                  onDismiss={() => handleDismiss(draft)}
                />
              ))}
              {message.error && <InlineAlert tone='error' title={message.error} />}
            </View>
          )
        : null}
    </View>
  );
};
