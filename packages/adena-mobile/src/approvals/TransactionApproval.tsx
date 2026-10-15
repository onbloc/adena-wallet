import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import {getDappVisibleAddress} from '@common/utils/account-address';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {
  classifyGnoSigningRisk,
  SigningRiskAssessment,
} from '@common/validation/validation-signing-risk';
import {validateInjectionDataWithAddress} from '@common/validation/validation-transaction';
import {InjectionMessageInstance} from '@inject/message/message';
import type {Document} from 'adena-module';
import React, {useEffect, useState} from 'react';
import {Switch} from 'react-native';

import {displayHost} from '../browser/url-origin';
import {estimateFee, FeeEstimate, withFee} from '../core/fees';
import {formatGnot} from '../core/format';
import {useWallet} from '../core/wallet-context';
import {useReauth} from '../security/reauth';
import {
  Body,
  ButtonPair,
  ErrorBanner,
  ListItem,
  Notice,
  Screen,
} from '../ui/components';
import {ApprovalTitle, DomainBox, InfoPill, RawData} from './approval-ui';
import {RiskNotices} from '../ui/risk-notices';
import {MessageSummary} from './message-summary';
import type {ApprovalProps} from './types';

/**
 * - broadcast: DO_CONTRACT, sign and broadcast
 * - sign: SIGN_TX, return the signed, encoded transaction
 * - amino: SIGN_AMINO, return the document and its signature
 */
export type TransactionMode = 'broadcast' | 'sign' | 'amino';

type State =
  | {phase: 'preparing'}
  | {
      phase: 'ready';
      document: Document;
      fee: FeeEstimate;
      risk: SigningRiskAssessment;
    }
  | {phase: 'blocked'; reason: string}
  | {phase: 'working'};

export function TransactionApproval({
  request,
  respond,
  dismiss,
  mode,
}: ApprovalProps & {mode: TransactionMode}) {
  const {net, wallet, account} = useWallet();
  const requestReauth = useReauth();
  const [state, setState] = useState<State>({phase: 'preparing'});
  const [acknowledged, setAcknowledged] = useState(false);
  const message = request.message as any;
  const data = message.data ?? {};
  const origin = getSiteName(message.protocol, message.hostname);
  const failed =
    mode === 'broadcast'
      ? WalletResponseFailureType.TRANSACTION_FAILED
      : WalletResponseFailureType.SIGN_FAILED;

  useEffect(() => {
    if (!net || !account) {
      return;
    }
    (async () => {
      const requestedChain = data.networkInfo?.chainId;
      if (requestedChain && requestedChain !== net.network.chainId) {
        setState({
          phase: 'blocked',
          reason: `The site asked for ${requestedChain}, but the wallet is on ${net.network.chainId}.`,
        });
        return;
      }
      const visibleAddress = await getDappVisibleAddress(
        account,
        net.network.addressPrefix,
      );
      const invalid = validateInjectionDataWithAddress(message, visibleAddress);
      if (invalid) {
        respond(invalid);
        return;
      }
      try {
        const draft = await net.transactionService.createDocument(
          account,
          net.network.networkId,
          data.messages,
          net.network.addressPrefix,
          data.gasWanted,
          data.gasFee,
          data.memo,
        );
        const fee = await estimateFee(net.gnoProvider, account, draft);
        const document = withFee(draft, fee.gasWanted, fee.gasFee);
        const risk = classifyGnoSigningRisk(document.msgs as any[]);
        setState({phase: 'ready', document, fee, risk});
      } catch (e) {
        setState({
          phase: 'blocked',
          reason: `The network rejected this transaction in simulation: ${
            (e as Error).message
          }`,
        });
      }
    })();
    // The request is fixed for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, account]);

  const approve = async () => {
    if (state.phase !== 'ready' || !net || !wallet || !account) {
      return;
    }
    const {document} = state;
    if (
      !(await requestReauth(`Approve the request from ${displayHost(origin)}`))
    ) {
      return;
    }
    setState({phase: 'working'});
    try {
      if (mode === 'amino') {
        const signature = await net.transactionService.createSignature(
          account,
          document,
        );
        respond(
          InjectionMessageInstance.success(
            WalletResponseSuccessType.SIGN_SUCCESS,
            {document, signature},
            message.key,
          ),
        );
        return;
      }
      const {signed} = await net.transactionService.createTransaction(
        wallet,
        account,
        document,
      );
      if (mode === 'sign') {
        respond(
          InjectionMessageInstance.success(
            WalletResponseSuccessType.SIGN_SUCCESS,
            {
              encodedTransaction:
                net.transactionService.encodeTransaction(signed),
            },
            message.key,
          ),
        );
        return;
      }
      const hash = net.transactionService.createHash(signed);
      try {
        const result = await net.transactionService.sendTransaction(
          wallet,
          account,
          signed,
          data.commit === true,
        );
        respond(
          InjectionMessageInstance.success(
            WalletResponseSuccessType.TRANSACTION_SUCCESS,
            result as any,
            message.key,
            message.withNotification,
          ),
        );
      } catch (e) {
        respond(
          InjectionMessageInstance.failure(
            failed,
            {hash, error: String(e), log: (e as {log?: string}).log},
            message.key,
            message.withNotification,
          ),
        );
      }
    } catch (e) {
      respond(
        InjectionMessageInstance.failure(
          failed,
          {error: {message: (e as Error).message}},
          message.key,
        ),
      );
    }
  };

  const reject = () => {
    const type =
      mode === 'broadcast'
        ? WalletResponseRejectType.TRANSACTION_REJECTED
        : WalletResponseRejectType.SIGN_REJECTED;
    respond(InjectionMessageInstance.failure(type, {}, message.key));
  };

  const highRisk = state.phase === 'ready' && state.risk.level === 'high';
  const title =
    mode === 'broadcast' ? 'Approve Transaction' : 'Sign Transaction';

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{
            title: 'Cancel',
            onPress: state.phase === 'blocked' ? dismiss : reject,
          }}
          confirm={{
            title: mode === 'broadcast' ? 'Approve' : 'Sign',
            testID: 'approve-transaction',
            onPress: approve,
            disabled: state.phase !== 'ready' || (highRisk && !acknowledged),
            loading: state.phase === 'working',
          }}
        />
      }>
      <ApprovalTitle>{title}</ApprovalTitle>
      <DomainBox origin={origin} />
      {state.phase === 'preparing' && (
        <Body muted>Simulating the transaction…</Body>
      )}
      {state.phase === 'blocked' && <ErrorBanner>{state.reason}</ErrorBanner>}
      {state.phase === 'ready' && (
        <>
          {(state.document.msgs as any[]).map((item, index) => (
            <MessageSummary key={index} message={item} index={index} />
          ))}
          <InfoPill label="Memo:" value={state.document.memo || '(Empty)'} />
          <InfoPill label="Network" value={net?.network.networkName ?? ''} />
          <InfoPill label="Network Fee" value={formatGnot(state.fee.gasFee)} />
          {mode !== 'broadcast' && (
            <Notice>
              The site receives a signed transaction and can broadcast it later.
            </Notice>
          )}
          <RiskNotices risk={state.risk} />
          {highRisk && (
            <ListItem
              title="I understand the risk"
              trailing={
                <Switch value={acknowledged} onValueChange={setAcknowledged} />
              }
            />
          )}
          <RawData json={state.document} />
        </>
      )}
    </Screen>
  );
}
