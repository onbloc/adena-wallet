import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Text } from '../../atoms';
import { InlineAlert, KeyValueRow } from '../../molecules';
import { useStyles } from './dapp-message-list.styles';

export interface DappMessageView {
  title: string;
  details: { label: string; value: string }[];
  code?: { name: string; body: string }[];
  warning?: string;
}

export interface DappMessageListProps {
  messages: DappMessageView[];
  // Ids are `${messageIndex}:${fileIndex}`.
  expandedCode?: string[];
  onToggleCode?: (id: string) => void;
  codeReviewPending?: boolean;
}

const lineCount = (body: string): number => body.split('\n').length;

// Shared by the in-app request screen and the Android sheet; code is shown in full, never summarized.
export const DappMessageList = ({ messages, expandedCode = [], onToggleCode, codeReviewPending }: DappMessageListProps): ReactElement => {
  const styles = useStyles();

  return (
    <>
      {messages.map((message, position) => ({ ...message, id: `${position}:${message.title}`, position })).map(message => (
        <View key={message.id} style={styles.message}>
          <Badge label={message.title} tone='info' />
          {message.warning ? <InlineAlert tone='warning' title={message.warning} /> : null}
          {message.details.map(detail => (
            <KeyValueRow
              key={detail.label}
              label={detail.label}
              value={detail.value}
              multiline={detail.value.length > 28 || detail.value.includes('\n')}
            />
          ))}
          {message.code?.map((file, index) => {
            const id = `${message.position}:${index}`;
            const expanded = expandedCode.includes(id);
            const handleToggle = (): void => onToggleCode?.(id);

            return (
              <View key={id} style={styles.file}>
                <View style={styles.fileHeader}>
                  <Text variant='meta' style={styles.fileName}>{`${file.name} · ${lineCount(file.body)} lines`}</Text>
                  <Button
                    label={expanded ? 'Hide code' : 'Show code'}
                    tone='tertiary'
                    size='compact'
                    fullWidth={false}
                    onPress={handleToggle}
                    testID={`dapp-code-toggle-${id}`}
                  />
                </View>
                {expanded && (
                  <Text selectable style={styles.code} testID={`dapp-code-body-${id}`}>{file.body}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
      {codeReviewPending ? <Text variant='meta' color='warning'>Open every code file to enable approval.</Text> : null}
    </>
  );
};
