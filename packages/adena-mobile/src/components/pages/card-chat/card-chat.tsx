import React, { ReactElement, useRef } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, IconName, Spinner, Text } from '../../atoms';
import { InlineAlert, TextField, TopBar } from '../../molecules';
import { CardReviewSheet, CardReviewSheetProps } from '../cards/card-review-sheet';
import { useStyles } from './card-chat.styles';

export interface ChatMessageView {
  id: string;
  // Answered questions read as done steps; answers as the user's own bubbles.
  from: 'bot' | 'user';
  text: string;
}

export interface ChatOptionView {
  key: string;
  label: string;
  description?: string;
  icon?: IconName;
}

export interface ChatInputView {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const STAGES = ['Ask', 'Check', 'Start'];

export interface CardChatPageProps {
  // 0 asking, 1 checking the summary, 2 approving.
  stage: number;
  messages: ChatMessageView[];
  question: string;
  // Fixed answers to the current question.
  options: ChatOptionView[];
  onSelect: (key: string) => void;
  // Free text, only where an answer cannot be a fixed choice (an address).
  input?: ChatInputView;
  onBack: () => void;
  onRestart: () => void;
  canRestart: boolean;
  preparing: boolean;
  error?: string;
  review: CardReviewSheetProps;
}

export const CardChatPage = ({
  stage,
  messages,
  question,
  options,
  onSelect,
  input,
  onBack,
  onRestart,
  canRestart,
  preparing,
  error,
  review,
}: CardChatPageProps): ReactElement => {
  const styles = useStyles();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const handleContentSizeChange = (): void => scrollRef.current?.scrollToEnd({ animated: true });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar
        title='New card'
        onBack={onBack}
        trailing={canRestart ? <Button label='Start over' tone='tertiary' size='compact' fullWidth={false} onPress={onRestart} /> : undefined}
      />
      <View style={styles.stepper} accessibilityRole='progressbar' accessibilityValue={{ min: 1, max: STAGES.length, now: stage + 1 }}>
        {STAGES.map((label, index) => (
          <View key={label} style={styles.stage}>
            <View style={[styles.stageBar, index <= stage && styles.stageBarDone]} />
            <Text variant='meta' color={index === stage ? 'primary' : 'secondary'} style={index === stage && styles.stageCurrent}>
              {`${index + 1} ${label}`}
            </Text>
          </View>
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps='handled'
        onContentSizeChange={handleContentSizeChange}
        testID='card-chat-thread'
      >
        {messages.map(message => (message.from === 'user'
          ? <View key={message.id} style={styles.userBubble}><Text variant='row' color='inverse'>{message.text}</Text></View>
          : (
              <View key={message.id} style={styles.doneRow}>
                <Icon name='check' size={18} color={styles.doneGlyph.color} />
                <Text variant='body' color='secondary' style={styles.doneText}>{message.text}</Text>
              </View>
            )))}
        <View style={styles.panel}>
          <Text style={styles.question} accessibilityRole='header'>{question}</Text>
          {error && <InlineAlert tone='error' title={error} />}
          {preparing && (
            <View style={styles.checking}>
              <Spinner size={16} />
              <Text variant='meta' color='secondary'>Checking with the chain…</Text>
            </View>
          )}
          {input && (
            <View style={styles.inputRow}>
              <View style={styles.input}>
                <TextField
                  label={input.label}
                  placeholder={input.placeholder}
                  value={input.value}
                  error={input.error}
                  autoCapitalize='none'
                  autoCorrect={false}
                  returnKeyType='done'
                  onChangeText={input.onChange}
                  onSubmitEditing={input.onSubmit}
                  testID='card-chat-input'
                />
              </View>
              <Button label='Send' size='compact' fullWidth={false} disabled={!input.value.trim()} onPress={input.onSubmit} testID='card-chat-submit' />
            </View>
          )}
          {options.length > 0 && (
            <View style={styles.options}>
              {options.map((option, index) => {
                const handlePress = (): void => onSelect(option.key);

                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole='button'
                    accessibilityLabel={option.label}
                    disabled={preparing}
                    onPress={handlePress}
                    style={({ pressed }) => [styles.option, index > 0 && styles.optionDivider, pressed && styles.optionPressed]}
                    testID={`card-chat-option-${option.key}`}
                  >
                    {option.icon && <View style={styles.optionIcon}><Icon name={option.icon} size={18} /></View>}
                    <View style={styles.optionText}>
                      <Text variant='row'>{option.label}</Text>
                      {option.description && <Text variant='meta' color='secondary'>{option.description}</Text>}
                    </View>
                    <Icon name='chevronRight' size={18} color={styles.chevron.color} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      <CardReviewSheet {...review} />
    </SafeAreaView>
  );
};
