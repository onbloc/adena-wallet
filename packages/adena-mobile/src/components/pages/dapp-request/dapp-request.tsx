import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Skeleton } from '../../atoms';
import { Card, Dialog, InlineAlert, KeyValueRow, Screen, TopBar } from '../../molecules';
import { DappMessageList, DappMessageView } from './dapp-message-list';
import { styles } from './dapp-request.styles';
import { DappRequester } from './dapp-requester';

export interface DappRequestPageProps {
  title: string;
  dappName: string;
  origin: string;
  callerPackage?: string;
  networkName: string;
  accountName: string;
  address: string;
  messages: DappMessageView[];
  fee?: string;
  feeWarning?: string;
  memo?: string;
  expandedCode?: string[];
  onToggleCode?: (id: string) => void;
  codeReviewPending?: boolean;
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
    <DappRequester style={styles.origin} dappName={props.dappName} origin={props.origin} callerPackage={props.callerPackage} />
    <Card>
      <KeyValueRow label='Account' value={props.accountName} />
      <KeyValueRow label='Address' value={props.address} multiline />
      <KeyValueRow label='Network' value={props.networkName} />
    </Card>
    {props.loading && <Skeleton height={120} />}
    <DappMessageList
      messages={props.messages}
      expandedCode={props.expandedCode}
      onToggleCode={props.onToggleCode}
      codeReviewPending={props.codeReviewPending}
    />
    {props.memo ? <KeyValueRow label='Memo' value={props.memo} multiline /> : null}
    {props.fee && <KeyValueRow label='Network fee' value={props.fee} emphasis />}
    {props.feeWarning && <InlineAlert tone='warning' title='High network fee' description={props.feeWarning} />}
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
