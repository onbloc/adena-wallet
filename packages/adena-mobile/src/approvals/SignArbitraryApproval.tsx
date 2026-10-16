import {
  WalletResponseFailureType,
  WalletResponseRejectType,
} from '@adena-wallet/sdk';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {InjectionMessageInstance} from '@inject/message/message';
import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {displayHost} from '../browser/url-origin';
import {useWallet} from '../core/wallet-context';
import {useReauth} from '../security/reauth';
import {Body, ButtonPair, Notice, Screen} from '../ui/components';
import {colors, colorTokens, fonts, monoFont} from '../ui/theme';
import {ApprovalTitle, DomainBox, InfoPill} from './approval-ui';
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
    <Screen
      footer={
        <ButtonPair
          cancel={{
            title: 'Cancel',
            onPress: () =>
              respond(
                InjectionMessageInstance.failure(
                  WalletResponseRejectType.SIGN_REJECTED,
                  {},
                  message.key,
                ),
              ),
          }}
          confirm={{
            title: 'Sign',
            testID: 'approve-sign',
            onPress: approve,
            loading: busy,
            disabled: !text,
          }}
        />
      }>
      <ApprovalTitle>Sign Message</ApprovalTitle>
      <DomainBox origin={origin} />
      <InfoPill label="Network" value={net?.network.chainId ?? ''} />
      <InfoPill label="Fee" value="None" />
      <InfoPill label="Signing with" value={signer} />
      {suspicious && (
        <Notice tone="danger">
          This message looks like a transaction, not a login message. Signing it
          may let the site act with your account.
        </Notice>
      )}
      <View style={styles.message}>
        <Text style={styles.messageLabel}>Message</Text>
        <ScrollView style={styles.messageBox} nestedScrollEnabled>
          <Text selectable style={styles.text}>
            {text}
          </Text>
        </ScrollView>
      </View>
      <Body muted>
        This signature proves you own this address. It isn’t a transaction and
        won’t move funds.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {gap: 5},
  messageLabel: {...fonts.body2Reg, color: colors.textMuted},
  messageBox: {
    maxHeight: 200,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colorTokens.neutral._7,
    backgroundColor: colorTokens.neutral._9,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {...monoFont, fontSize: 13, lineHeight: 19, color: colors.text},
});
