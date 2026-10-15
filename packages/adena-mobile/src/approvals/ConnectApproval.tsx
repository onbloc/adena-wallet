import {
  WalletResponseFailureType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import {InjectionMessageInstance} from '@inject/message/message';
import {getSiteName} from '@common/utils/url-parameter-utils';
import React, {useState} from 'react';

import {useWallet} from '../core/wallet-context';
import {displayHost} from '../browser/url-origin';
import {Address} from '../ui/address';
import {Body, Button, Card, Notice, Screen, Title} from '../ui/components';
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
      const requested = (message as any).data?.chainIds;
      const chainIds: string[] = requested
        ? (Array.isArray(requested) ? requested : [requested]).filter(
            (id: unknown) => typeof id === 'string',
          )
        : [net.network.chainId];
      for (const chainId of chainIds) {
        await base.establishService.establishBy(account.id, chainId, {
          hostname: origin,
          accountId: account.id,
          appName,
          favicon: null,
        });
      }
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
    <Screen>
      <Title>Connect to {appName}</Title>
      <Card>
        <Body>{displayHost(origin)}</Body>
        <Body muted>{origin}</Body>
      </Card>
      <Body muted>
        The site will see this address and can ask you to approve transactions.
      </Body>
      {address && <Address value={address} />}
      <Notice>
        Only connect to sites you opened yourself. Check the address above,
        letter by letter.
      </Notice>
      <Button title="Connect" onPress={approve} loading={busy} />
      <Button title="Cancel" variant="secondary" onPress={dismiss} />
    </Screen>
  );
}
