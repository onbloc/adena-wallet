import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {InjectionMessageInstance} from '@inject/message/message';
import React, {useState} from 'react';

import {displayHost, originOf} from '../browser/url-origin';
import {useWallet} from '../core/wallet-context';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Notice,
  Row,
  Screen,
  Title,
} from '../ui/components';
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
    <Screen>
      <Title>{mode === 'add' ? 'Add network' : 'Switch network'}</Title>
      <Card>
        <Body>{displayHost(origin)}</Body>
        <Body muted>{origin}</Body>
      </Card>
      <Card>
        <Row label="Chain ID" value={String(data.chainId ?? '')} />
        {mode === 'add' && (
          <Row label="Name" value={String(data.chainName ?? '')} />
        )}
        {mode === 'add' && (
          <Row label="RPC" value={String(data.rpcUrl ?? '')} />
        )}
      </Card>
      {mode === 'add' && (
        <Notice>
          A network added by a site can report false balances and transaction
          results. Only add networks you trust.
        </Notice>
      )}
      <ErrorText>{error}</ErrorText>
      <Button
        title={mode === 'add' ? 'Add' : 'Switch'}
        onPress={approve}
        loading={busy}
      />
      <Button title="Reject" variant="secondary" onPress={reject} />
    </Screen>
  );
}
