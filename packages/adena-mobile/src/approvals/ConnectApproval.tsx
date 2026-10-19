import {
  WalletResponseFailureType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import {InjectionMessageInstance} from '@inject/message/message';
import {getSiteName} from '@common/utils/url-parameter-utils';
import FaviconDefault from '@assets/favicon-default.svg';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {establishSite, normalizeChainIds} from '../core/establish';
import {useWallet} from '../core/wallet-context';
import {Address} from '../ui/address';
import {Body, ButtonPair, Screen} from '../ui/components';
import {
  ApprovalTitle,
  DomainBox,
  KeyValue,
  MessageCard,
  PermissionTable,
} from './approval-ui';
import type {ApprovalProps} from './types';

/** ADD_ESTABLISH: lets the site see the address and ask for signatures. */
export function ConnectApproval({request, respond, dismiss}: ApprovalProps) {
  const {base, net, account, address} = useWallet();
  const [busy, setBusy] = useState(false);
  const {message} = request;
  const origin = getSiteName(message.protocol, message.hostname);
  const appName = String((message as any).data?.name ?? 'Unknown');

  const approve = async () => {
    if (!account || !net) {
      return;
    }
    setBusy(true);
    try {
      await establishSite(
        base,
        {hostname: origin, accountId: account.id, appName, favicon: null},
        normalizeChainIds((message as any).data?.chainIds),
        net.network.chainId,
      );
      respond(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.CONNECTION_SUCCESS,
          {},
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
    }
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: dismiss}}
          confirm={{
            title: 'Connect',
            testID: 'approve-connect',
            onPress: approve,
            loading: busy,
          }}
        />
      }>
      <ApprovalTitle>{`Connect to ${appName}`}</ApprovalTitle>
      <View style={styles.logo}>
        <FaviconDefault width={80} height={80} />
      </View>
      <DomainBox origin={origin} />
      <PermissionTable
        items={[
          'See your address, balance and activity',
          'Suggest transactions to approve',
        ]}
      />
      {address && (
        <MessageCard title="Account">
          <KeyValue
            label="Address"
            stacked
            value={<Address value={address} />}
          />
        </MessageCard>
      )}
      <Body muted>
        Only connect to websites you trust and opened yourself. Check the site
        address above, letter by letter.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {alignSelf: 'center'},
});
