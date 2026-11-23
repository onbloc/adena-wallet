import React, { ReactElement } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../../theme';
import { Badge, Button, Skeleton, Text } from '../../atoms';
import { InlineAlert, KeyValueRow, TextField } from '../../molecules';
import { DappMessageView } from '../dapp-request';
import { styles } from './inject-sheet.styles';

export const SheetAuthMode = {
  BIOMETRIC: 'biometric',
  PASSWORD: 'password',
} as const;

export type SheetAuthMode = (typeof SheetAuthMode)[keyof typeof SheetAuthMode];

export interface InjectSheetAuthView {
  mode: SheetAuthMode;
  biometricLabel?: string;
  password: string;
  onChangePassword: (value: string) => void;
}

export interface InjectSheetPageProps {
  title: string;
  dappName?: string;
  origin?: string;
  rows: { label: string; value: string; multiline?: boolean }[];
  messages: DappMessageView[];
  fee?: string;
  loading: boolean;
  error?: string;
  // Blocking state (invalid link, no wallet): only a close action is offered.
  unavailable?: { title: string; description: string };
  auth?: InjectSheetAuthView;
  approveLabel: string;
  approving: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
}

// Bottom sheet drawn by the translucent Android activity on top of the calling dApp.
export const InjectSheetPage = (props: InjectSheetPageProps): ReactElement => {
  const insets = useSafeAreaInsets();
  const approveLabel = props.auth?.mode === SheetAuthMode.BIOMETRIC && props.auth.biometricLabel
    ? `${props.approveLabel} with ${props.auth.biometricLabel}`
    : props.approveLabel;

  return (
    <View style={styles.root}>
      <View style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.space24) }]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <Text variant='title'>{props.unavailable?.title ?? props.title}</Text>
        {props.unavailable
          ? (
              <>
                <Text variant='body' color='secondary'>{props.unavailable.description}</Text>
                <Button label='Close' tone='secondary' onPress={props.onReject} />
              </>
            )
          : (
              <>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                  <View style={styles.origin}>
                    <Text variant='section'>{props.dappName}</Text>
                    <Text variant='meta' color='secondary'>{props.origin}</Text>
                  </View>
                  {props.rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline={row.multiline} />)}
                  {props.loading && <Skeleton height={96} />}
                  {props.messages.map((message, position) => ({ ...message, id: `${position}:${message.title}` })).map(message => (
                    <View key={message.id} style={styles.message}>
                      <Badge label={message.title} tone='info' />
                      {message.details.map(detail => (
                        <KeyValueRow key={detail.label} label={detail.label} value={detail.value} multiline={detail.value.length > 28} />
                      ))}
                    </View>
                  ))}
                  {props.fee && <KeyValueRow label='Network fee' value={props.fee} emphasis />}
                  {props.auth?.mode === SheetAuthMode.PASSWORD && (
                    <TextField
                      label='Wallet password'
                      value={props.auth.password}
                      onChangeText={props.auth.onChangePassword}
                      placeholder='Password'
                      secure
                      autoCapitalize='none'
                    />
                  )}
                  {props.error && <InlineAlert tone='error' title='This request cannot be completed' description={props.error} />}
                </ScrollView>
                <View style={styles.actions}>
                  <Button label='Reject' tone='secondary' style={styles.action} disabled={props.approving} onPress={props.onReject} />
                  <Button
                    label={approveLabel}
                    style={styles.action}
                    leadingIcon={props.auth?.mode === SheetAuthMode.BIOMETRIC ? 'fingerprint' : undefined}
                    disabled={!props.canApprove}
                    loading={props.approving}
                    onPress={props.onApprove}
                    testID='inject-sheet-approve'
                  />
                </View>
              </>
            )}
      </View>
    </View>
  );
};
