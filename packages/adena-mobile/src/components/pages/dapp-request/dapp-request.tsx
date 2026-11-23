import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Skeleton, Text } from '../../atoms';
import { Card, Dialog, InlineAlert, KeyValueRow, Screen, TopBar } from '../../molecules';
import { styles } from './dapp-request.styles';

export interface DappMessageView {
  title: string;
  details: { label: string; value: string }[];
}

export interface DappRequestPageProps {
  title: string;
  dappName: string;
  origin: string;
  networkName: string;
  accountName: string;
  address: string;
  messages: DappMessageView[];
  fee?: string;
  memo?: string;
  loading: boolean;
  error?: string;
  approveLabel: string;
  approving: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  networkSwitch?: { visible: boolean; networkName: string; onConfirm: () => void; onCancel: () => void };
}

export const DappRequestPage = (props: DappRequestPageProps): ReactElement => (
  <Screen
    header={<TopBar title={props.title} />}
    footer={(
      <View style={styles.actions}>
        <Button label='Reject' tone='secondary' style={styles.action} disabled={props.approving} onPress={props.onReject} testID='dapp-reject' />
        <Button
          label={props.approveLabel}
          style={styles.action}
          disabled={!props.canApprove}
          loading={props.approving}
          onPress={props.onApprove}
          testID='dapp-approve'
        />
      </View>
    )}
  >
    <View style={styles.origin}>
      <Text variant='section'>{props.dappName}</Text>
      <Text variant='meta' color='secondary'>{props.origin}</Text>
      <Text variant='meta' color='secondary'>The name is provided by the app. Confirm the address above before approving.</Text>
    </View>
    <Card>
      <KeyValueRow label='Account' value={props.accountName} />
      <KeyValueRow label='Address' value={props.address} multiline />
      <KeyValueRow label='Network' value={props.networkName} />
    </Card>
    {props.loading && <Skeleton height={120} />}
    {props.messages.map((message, position) => ({ ...message, id: `${position}:${message.title}` })).map(message => (
      <View key={message.id} style={styles.message}>
        <Badge label={message.title} tone='info' />
        {message.details.map(detail => (
          <KeyValueRow key={detail.label} label={detail.label} value={detail.value} multiline={detail.value.length > 28} />
        ))}
      </View>
    ))}
    {props.memo ? <KeyValueRow label='Memo' value={props.memo} multiline /> : null}
    {props.fee && <KeyValueRow label='Network fee' value={props.fee} emphasis />}
    {props.error && <InlineAlert tone='error' title='This request cannot be completed' description={props.error} />}
    {props.networkSwitch && (
      <Dialog
        visible={props.networkSwitch.visible}
        title='Switch network?'
        description={`Use ${props.networkSwitch.networkName} for this action.`}
        confirmLabel='Continue'
        onConfirm={props.networkSwitch.onConfirm}
        onCancel={props.networkSwitch.onCancel}
      />
    )}
  </Screen>
);
