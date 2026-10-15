import {
  WalletResponseFailureType,
  WalletResponseRejectType,
} from '@adena-wallet/sdk';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {InjectionMessageInstance} from '@inject/message/message';
import React, {useState} from 'react';
import {StyleSheet, Text} from 'react-native';

import {displayHost} from '../browser/url-origin';
import {useWallet} from '../core/wallet-context';
import {useReauth} from '../security/reauth';
import {Body, Button, Card, Notice, Screen, Title} from '../ui/components';
import {colors} from '../ui/theme';
import type {ApprovalProps} from './types';

/** Text that looks like a transaction or key material rather than a login message. */
export function looksLikeTransaction(text: string): boolean {
  return /"(msg|msgs|chain_id|account_number|sequence|fee)"\s*:/.test(text);
}

/** SIGN_ARBITRARY: signs a message with the account key (ADR-036 style). */
export function SignArbitraryApproval({request, respond}: ApprovalProps) {
  const {net, account} = useWallet();
  const requestReauth = useReauth();
  const [busy, setBusy] = useState(false);
  const message = request.message as any;
  const signer = String(message.data?.signer ?? '');
  const text = String(message.data?.data ?? '');
  const origin = getSiteName(message.protocol, message.hostname);
  const suspicious = looksLikeTransaction(text);

  const approve = async () => {
    if (!net || !account) {
      return;
    }
    if (!(await requestReauth(`Sign a message for ${displayHost(origin)}`))) {
      return;
    }
    setBusy(true);
    try {
      const signed = await net.transactionService.signArbitraryDoc(
        account.id,
        net.network.networkId,
        signer,
        text,
      );
      // The extension builds this success response by hand (no SDK builder).
      respond({
        code: 0,
        key: message.key,
        type: 'SIGN_ARBITRARY',
        status: 'success',
        message: '',
        data: signed,
      });
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
      <Title>Sign message</Title>
      <Card>
        <Body>{displayHost(origin)}</Body>
        <Body muted>{origin}</Body>
      </Card>
      {suspicious && (
        <Notice tone="danger">
          This message looks like a transaction, not a login message. Signing it
          may let the site act with your account.
        </Notice>
      )}
      <Card>
        <Text selectable style={styles.text}>
          {text}
        </Text>
      </Card>
      <Button title="Sign" onPress={approve} loading={busy} />
      <Button
        title="Reject"
        variant="secondary"
        onPress={() =>
          respond(
            InjectionMessageInstance.failure(
              WalletResponseRejectType.SIGN_REJECTED,
              {},
              message.key,
            ),
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: {fontFamily: 'Menlo', fontSize: 13, color: colors.text},
});
