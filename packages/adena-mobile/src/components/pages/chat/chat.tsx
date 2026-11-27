import React, { ReactElement, useRef } from 'react';
import { FlatList, View } from 'react-native';

import { Button, Chip, IconButton, Text } from '../../atoms';
import { AiSettingsSheet, AiSettingsSheetProps, ChatBubble, ChatComposer, InlineAlert, Screen, TopBar, TransferReviewSheet, TransferReviewSheetProps } from '../../molecules';
import { ChatMessageView, ChatSetup } from '../../view-models';
import { useStyles } from './chat.styles';

export interface ChatProps {
  messages: ChatMessageView[];
  setup: ChatSetup;
  // From the setup banner and the top-bar action.
  onOpenSettings: () => void;
  input: string;
  onChangeInput: (value: string) => void;
  sending: boolean;
  onSend: () => void;
  onStop: () => void;
  // Only enabled when there are messages and no reply is streaming.
  onNewChat: () => void;
  onBack: () => void;
  onReviewDraft: (draftId: string) => void;
  onDismissDraft: (draftId: string) => void;
  settings: AiSettingsSheetProps;
  // From a transfer that is still pending or whose outcome is unknown.
  onOpenActivity: () => void;
  // When set, the review sheet is shown.
  review?: TransferReviewSheetProps;
  // Empty-state chips.
  suggestions?: string[];
  onSelectSuggestion?: (text: string) => void;
}

interface Banner {
  title: string;
  description?: string;
  progress?: number;
}

const LOCAL_TITLES = {
  idle: 'The on-device model is not loaded.',
  downloading: 'Downloading the on-device model…',
  loading: 'Loading the on-device model…',
  error: 'The on-device model failed to load.',
} as const;

// Null when the assistant is ready to chat.
const getBanner = (setup: ChatSetup): Banner | null => {
  if (setup.kind === 'needs-key') {
    return { title: 'Add an OpenAI API key to start chatting.' };
  }

  if (setup.kind === 'local-model' && setup.state !== 'ready') {
    return {
      title: LOCAL_TITLES[setup.state],
      description: setup.message,
      progress: setup.state === 'downloading' && setup.percentage !== undefined && Number.isFinite(setup.percentage)
        ? Math.min(100, Math.max(0, setup.percentage))
        : undefined,
    };
  }

  return null;
};

const keyExtractor = (message: ChatMessageView): string => message.id;

const EXAMPLE_HINT = 'Send 1 GNOT to <address>';

// Assistant conversation: transcript, setup banner and composer, plus the settings and review sheets.
export const Chat = ({
  messages,
  setup,
  onOpenSettings,
  input,
  onChangeInput,
  sending,
  onSend,
  onStop,
  onNewChat,
  onBack,
  onReviewDraft,
  onDismissDraft,
  settings,
  review,
  onOpenActivity,
  suggestions,
  onSelectSuggestion,
}: ChatProps): ReactElement => {
  const styles = useStyles();
  const listRef = useRef<FlatList<ChatMessageView>>(null);
  const banner = getBanner(setup);

  const scrollToEnd = (): void => listRef.current?.scrollToEnd({ animated: true });

  const renderMessage = ({ item }: { item: ChatMessageView }): ReactElement => (
    <ChatBubble message={item} onReviewDraft={onReviewDraft} onDismissDraft={onDismissDraft} onViewActivity={onOpenActivity} />
  );

  const header = (
    <TopBar
      title='Assistant'
      onBack={onBack}
      trailing={(
        <View style={styles.trailing}>
          <IconButton icon='compose' accessibilityLabel='New chat' disabled={messages.length === 0 || sending} onPress={onNewChat} testID='chat-new' />
          <IconButton icon='settings' accessibilityLabel='AI settings' onPress={onOpenSettings} testID='chat-settings' />
        </View>
      )}
    />
  );

  const footer = (
    <>
      {banner && (
        <View style={styles.banner} testID='chat-setup-banner'>
          <InlineAlert tone='info' title={banner.title} description={banner.description} />
          {banner.progress !== undefined && <Text variant='meta' color='secondary' align='center'>{`${Math.round(banner.progress)}%`}</Text>}
          <Button label='Open AI settings' tone='secondary' size='compact' onPress={onOpenSettings} testID='chat-setup-action' />
        </View>
      )}
      <ChatComposer
        value={input}
        onChangeText={onChangeInput}
        sending={sending}
        disabled={banner !== null}
        placeholder={banner ? 'Set up the assistant to chat' : undefined}
        onSend={onSend}
        onStop={onStop}
      />
    </>
  );

  const empty = (
    <View style={styles.empty} testID='chat-empty'>
      <Text variant='section' align='center'>Ask about your wallet</Text>
      <Text variant='body' color='secondary' align='center'>Check balances, look up activity, or prepare a transfer you review before anything is sent.</Text>
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map(text => <Chip key={text} label={text} disabled={banner !== null || !onSelectSuggestion} onPress={() => onSelectSuggestion?.(text)} />)}
        </View>
      )}
      <Text variant='meta' color='disabled' align='center'>{`Try: ${EXAMPLE_HINT}`}</Text>
    </View>
  );

  return (
    <Screen scrollable={false} header={header} footer={footer} testID='chat-page'>
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        ListEmptyComponent={empty}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps='handled'
      />
      <AiSettingsSheet {...settings} />
      {review && <TransferReviewSheet {...review} />}
    </Screen>
  );
};
