import {GNOT_TOKEN} from '@common/constants/token.constant';
import {
  classifyGnoSigningRisk,
  SigningRiskAssessment,
} from '@common/validation/validation-signing-risk';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Document} from 'adena-module';
import BigNumber from 'bignumber.js';
import React, {useEffect, useState} from 'react';

import {estimateFee, FeeEstimate, withFee} from '../core/fees';
import {formatGnot} from '../core/format';
import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {useReauth} from '../security/reauth';
import {Address} from '../ui/address';
import {RiskNotices} from '../ui/risk-notices';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Mono,
  Notice,
  Row,
  Screen,
  Title,
} from '../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'SendConfirm'>;

type State =
  | {phase: 'preparing'}
  | {
      phase: 'ready';
      document: Document;
      fee: FeeEstimate;
      risk: SigningRiskAssessment;
    }
  | {phase: 'failed'; message: string}
  | {phase: 'sending'}
  | {phase: 'sent'; hash: string};

export function SendConfirmScreen({route, navigation}: Props) {
  const {to, ugnot, memo} = route.params;
  const {net, wallet, account, address} = useWallet();
  const requestReauth = useReauth();
  const [state, setState] = useState<State>({phase: 'preparing'});

  useEffect(() => {
    if (!net || !account || !address) {
      return;
    }
    (async () => {
      try {
        const message = {
          type: '/bank.MsgSend',
          value: {
            from_address: address,
            to_address: to,
            amount: `${ugnot}${GNOT_TOKEN.denom}`,
          },
        };
        const draft = await net.transactionService.createDocument(
          account,
          net.network.networkId,
          [message],
          net.network.addressPrefix,
          undefined,
          undefined,
          memo,
        );
        const fee = await estimateFee(net.gnoProvider, account, draft);
        const document = withFee(draft, fee.gasWanted, fee.gasFee);
        const risk = classifyGnoSigningRisk(document.msgs as any[], {
          knownRecipients: new Set([address]),
        });
        setState({phase: 'ready', document, fee, risk});
      } catch (e) {
        setState({
          phase: 'failed',
          message: `The network rejected this transfer in simulation: ${
            (e as Error).message
          }`,
        });
      }
    })();
  }, [net, account, address, to, ugnot, memo]);

  const confirm = async () => {
    if (state.phase !== 'ready' || !net || !wallet || !account) {
      return;
    }
    const {document} = state;
    if (!(await requestReauth('Approve sending GNOT'))) {
      return;
    }
    setState({phase: 'sending'});
    try {
      const {signed} = await net.transactionService.createTransaction(
        wallet,
        account,
        document,
      );
      const result = await net.transactionService.sendTransaction(
        wallet,
        account,
        signed,
        false,
      );
      setState({phase: 'sent', hash: result.hash});
    } catch (e) {
      setState({
        phase: 'failed',
        message: `Sending failed: ${(e as Error).message}`,
      });
    }
  };

  if (state.phase === 'sent') {
    return (
      <Screen>
        <Title>Submitted</Title>
        <Body muted>The transaction was broadcast. Transaction hash:</Body>
        <Mono>{state.hash}</Mono>
        <Button title="Done" onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  // What is shown comes from the document that will be signed, not from the form.
  const sendMessage =
    state.phase === 'ready' ? (state.document.msgs[0] as any) : null;
  const total =
    state.phase === 'ready'
      ? BigNumber(ugnot).plus(state.fee.gasFee).toFixed(0)
      : null;

  return (
    <Screen>
      <Title>Review transfer</Title>
      {state.phase === 'preparing' && (
        <Body muted>Simulating the transaction…</Body>
      )}
      {state.phase === 'failed' && <ErrorText>{state.message}</ErrorText>}
      {sendMessage && state.phase === 'ready' && (
        <>
          <Card>
            <Body muted>To</Body>
            <Address value={sendMessage.value.to_address} />
          </Card>
          <Card>
            <Row
              label="Amount"
              value={formatGnot(
                sendMessage.value.amount.replace(GNOT_TOKEN.denom, ''),
              )}
            />
            <Row label="Network fee" value={formatGnot(state.fee.gasFee)} />
            <Row label="Total" value={formatGnot(total)} />
            <Row label="Network" value={net?.network.networkName ?? ''} />
            {!!state.document.memo && (
              <Row label="Memo" value={state.document.memo} />
            )}
          </Card>
          <RiskNotices risk={state.risk} />
          <Notice>
            Check the full address against the one the recipient gave you, not
            just the first and last characters.
          </Notice>
        </>
      )}
      <Button
        title="Send"
        onPress={confirm}
        disabled={state.phase !== 'ready'}
        loading={state.phase === 'sending'}
      />
      <Button
        title="Cancel"
        variant="secondary"
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
}
