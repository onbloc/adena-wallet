import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {InjectionMessageInstance} from '@inject/message/message';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {originOf} from '../browser/url-origin';
import {useWallet} from '../core/wallet-context';
import {Body, ButtonPair, ErrorText, Notice, Screen} from '../ui/components';
import {ApprovalTitle, DomainBox, KeyValue, MessageCard} from './approval-ui';
import type {ApprovalProps} from './types';

/** SWITCH_NETWORK and ADD_NETWORK. */
export function NetworkApproval({
  request,
  respond,
  mode,
}: ApprovalProps & {mode: 'switch' | 'add'}) {
  const {base, reloadNetworks, switchNetwork} = useWallet();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const message = request.message as any;
  const data = message.data ?? {};
  const origin = getSiteName(message.protocol, message.hostname);

  const approve = async () => {
    setBusy(true);
    try {
      if (mode === 'add') {
        if (
          !originOf(String(data.rpcUrl ?? '')) ||
          !String(data.rpcUrl).startsWith('https://')
        ) {
          setError('The RPC address must be an https URL.');
          return;
        }
        await base.chainService.addGnoNetwork(
          String(data.chainName),
          String(data.rpcUrl),
          String(data.chainId),
          '',
        );
        await reloadNetworks();
        respond(
          InjectionMessageInstance.success(
            WalletResponseSuccessType.ADD_NETWORK_SUCCESS,
            data,
            message.key,
          ),
        );
        return;
      }
      const networks = await reloadNetworks();
      const target = networks.find(
        item => item.chainId === data.chainId && item.deleted !== true,
      );
      if (!target) {
        respond(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.UNADDED_NETWORK,
            data,
            message.key,
          ),
        );
        return;
      }
      await switchNetwork(target.id);
      respond(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.SWITCH_NETWORK_SUCCESS,
          data,
          message.key,
        ),
      );
    } catch (e) {
      respond(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {error: (e as Error).message},
          message.key,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const reject = () =>
    respond(
      InjectionMessageInstance.failure(
        mode === 'add'
          ? WalletResponseRejectType.ADD_NETWORK_REJECTED
          : WalletResponseRejectType.SWITCH_NETWORK_REJECTED,
        data,
        message.key,
      ),
    );

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: reject}}
          confirm={{
            title: mode === 'add' ? 'Approve' : 'Switch',
            testID: 'approve-network',
            onPress: approve,
            loading: busy,
          }}
        />
      }>
      <ApprovalTitle>
        {mode === 'add'
          ? `Add ${String(data.chainName ?? 'Network')}`
          : `Switch to ${String(data.chainId ?? '')}`}
      </ApprovalTitle>
      <View style={styles.logo}>
        <UnknownLogo width={80} height={80} />
      </View>
      <DomainBox origin={origin} />
      {mode === 'add' ? (
        <Notice tone="danger">
          You’re adding an unverified network. Adena doesn’t verify custom
          networks, and a malicious one can report false balances and
          transaction results. Only add networks that you trust.
        </Notice>
      ) : (
        <Body muted center>
          This will switch the current network on Adena to the one that matches
          the connected dapp.
        </Body>
      )}
      <MessageCard title="Network">
        {mode === 'add' && (
          <KeyValue label="Name" stacked value={String(data.chainName ?? '')} />
        )}
        {mode === 'add' && (
          <KeyValue label="RPC URL" stacked value={String(data.rpcUrl ?? '')} />
        )}
        <KeyValue label="Chain ID" stacked value={String(data.chainId ?? '')} />
      </MessageCard>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {alignSelf: 'center'},
});
