import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import type { StdSignDoc } from '@cosmjs/amino';
import { isLedgerAccount } from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { decodeParameter, getSiteName, parseParameters } from '@common/utils/client-utils';
import {
  deserializeSignDoc,
  serializeSignDoc,
} from '@common/utils/cosmos-serialize';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import {
  CosmosResponseExecuteType,
  SerializedSignDoc,
  SignCosmosAminoParams,
  SignCosmosDirectParams,
} from '@inject/types';
import { RoutePath } from '@types';

// TODO: replace with `InjectionMessageInstance.success/failure` once
// `@adena-wallet/sdk` is updated so `WalletMessageInfo` contains entries for
// Cosmos types. Shared rationale with `src/inject/message/methods/cosmos.ts`.
function createCosmosResponse(
  type: CosmosResponseExecuteType,
  status: 'success' | 'failure',
  key: string | undefined,
  data?: Record<string, unknown>,
  message = '',
): InjectionMessage {
  return {
    code: status === 'success' ? 0 : 1,
    key,
    type: type as unknown as WalletResponseType,
    status,
    message,
    data,
  };
}

type CosmosSignMode = 'amino' | 'direct';

const ApproveSignCosmosContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();

  const [key, setKey] = useState<string>('');
  const [hostname, setHostname] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('');
  const [mode, setMode] = useState<CosmosSignMode | null>(null);
  const [chainId, setChainId] = useState<string>('');
  const [signer, setSigner] = useState<string>('');
  const [rawSignDoc, setRawSignDoc] = useState<unknown>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    walletService
      .isLocked()
      .then((locked) => locked && navigate(RoutePath.ApproveLogin + location.search));
  }, [walletService]);

  useEffect(() => {
    try {
      const params = parseParameters(location.search);
      setKey(params.key);
      setHostname(params.hostname);
      setProtocol(params.protocol);
      if (params.data) {
        const message = decodeParameter(params.data) as InjectionMessage | null;
        if (!message) return;
        const executeType = message.type as unknown as string;
        if (executeType === CosmosResponseExecuteType.SIGN_COSMOS_AMINO) {
          const data = (message.data ?? {}) as SignCosmosAminoParams;
          setMode('amino');
          setChainId(data.chainId);
          setSigner(data.signer);
          setRawSignDoc(data.signDoc);
        } else if (executeType === CosmosResponseExecuteType.SIGN_COSMOS_DIRECT) {
          const data = (message.data ?? {}) as SignCosmosDirectParams;
          setMode('direct');
          setChainId(data.chainId);
          setSigner(data.signer);
          setRawSignDoc(data.signDoc);
        }
      }
    } catch (error) {
      console.warn('[ApproveSignCosmos] initRequest failed:', error);
    }
  }, [location]);

  const siteName = useMemo(() => getSiteName(protocol, hostname), [protocol, hostname]);
  const responseType = useMemo<CosmosResponseExecuteType>(
    () =>
      mode === 'direct'
        ? CosmosResponseExecuteType.SIGN_COSMOS_DIRECT
        : CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
    [mode],
  );

  const sendFailure = useCallback(
    (failureType: string, detail?: string) => {
      chrome.runtime.sendMessage(
        createCosmosResponse(
          responseType,
          'failure',
          key,
          detail ? { error: detail } : undefined,
          failureType,
        ),
      );
    },
    [responseType, key],
  );

  const onClickCancel = useCallback(() => {
    // SIGN_REJECTED lives in SDK `WalletMessageInfo`, so `InjectionMessage
    // Instance.failure` fills in the human-readable message and Gno-compatible
    // `code: 4000` — matching the Gno `Sign()` cancel response.
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.SIGN_REJECTED,
        {},
        key,
      ),
    );
    window.close();
  }, [key]);

  const onClickApprove = useCallback(async () => {
    if (!currentAccount || !mode || !rawSignDoc) {
      sendFailure(WalletResponseFailureType.UNEXPECTED_ERROR, 'Sign state not ready');
      window.close();
      return;
    }

    // Ledger accounts take a different path: AMINO routes through a
    // hardware-loading page that owns the `AdenaLedgerConnector` (mirroring
    // the Gno ApproveSignLoading pattern), and DIRECT is rejected up front
    // because the Cosmos Ledger app only signs SIGN_MODE_LEGACY_AMINO_JSON.
    // dApps should have already downgraded via `getOfflineSignerAuto` on the
    // `isNanoLedger` flag we publish in `cosmosGetKey` — the explicit reject
    // is a safety net for dApps that bypass it.
    if (isLedgerAccount(currentAccount)) {
      if (mode === 'direct') {
        sendFailure(
          WalletResponseFailureType.UNSUPPORTED_TYPE,
          'LEDGER_SIGN_DIRECT_NOT_SUPPORTED',
        );
        window.close();
        return;
      }
      navigate(RoutePath.ApproveSignCosmosLedgerLoading, {
        state: {
          signDoc: rawSignDoc as StdSignDoc,
          responseKey: key,
        },
      });
      return;
    }

    setProcessing(true);
    try {
      if (mode === 'amino') {
        const response = await transactionService.signCosmosAminoDoc(
          currentAccount.id,
          rawSignDoc as never,
        );
        chrome.runtime.sendMessage(
          createCosmosResponse(responseType, 'success', key, {
            signed: response.signed,
            signature: response.signature,
          }),
        );
      } else {
        const nativeDoc = deserializeSignDoc(rawSignDoc as SerializedSignDoc);
        const response = await transactionService.signCosmosDirectDoc(
          currentAccount.id,
          nativeDoc,
        );
        chrome.runtime.sendMessage(
          createCosmosResponse(responseType, 'success', key, {
            signed: serializeSignDoc(response.signed),
            signature: response.signature,
          }),
        );
      }
      window.close();
    } catch (error) {
      const detail = (error as Error)?.message ?? String(error);
      setErrorMessage(detail);
      setProcessing(false);
      const failureType =
        detail === 'LEDGER_NOT_SUPPORTED'
          ? WalletResponseFailureType.UNSUPPORTED_TYPE
          : WalletResponseFailureType.UNEXPECTED_ERROR;
      sendFailure(failureType, detail);
    }
  }, [mode, rawSignDoc, currentAccount, transactionService, responseType, key, sendFailure]);

  const prettySignDoc = useMemo(() => {
    try {
      return JSON.stringify(rawSignDoc, null, 2);
    } catch {
      return String(rawSignDoc);
    }
  }, [rawSignDoc]);

  return (
    <Wrapper>
      <Header>
        <Title>Sign Cosmos Transaction</Title>
        <SiteLine>{siteName || hostname}</SiteLine>
      </Header>
      <Section>
        <Label>Mode</Label>
        <Value>{mode === 'direct' ? 'SIGN_MODE_DIRECT' : mode === 'amino' ? 'SIGN_MODE_LEGACY_AMINO_JSON' : '—'}</Value>
      </Section>
      <Section>
        <Label>Chain</Label>
        <Value>{chainId || '—'}</Value>
      </Section>
      <Section>
        <Label>Signer</Label>
        <Value>{signer || '—'}</Value>
      </Section>
      <Section>
        <Label>SignDoc (raw)</Label>
        <Pre>{prettySignDoc}</Pre>
      </Section>
      {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
      <Actions>
        <ActionButton onClick={onClickCancel} disabled={processing}>
          Cancel
        </ActionButton>
        <ActionButton primary onClick={onClickApprove} disabled={processing || !mode || !currentAccount}>
          {processing ? 'Signing…' : 'Approve'}
        </ActionButton>
      </Actions>
    </Wrapper>
  );
};

export default ApproveSignCosmosContainer;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  max-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.h2`
  font-size: 16px;
  margin: 0;
`;

const SiteLine = styled.span`
  font-size: 12px;
  opacity: 0.7;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.span`
  font-size: 11px;
  opacity: 0.6;
  text-transform: uppercase;
`;

const Value = styled.span`
  font-size: 13px;
  word-break: break-all;
`;

const Pre = styled.pre`
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.04);
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
`;

const ErrorBox = styled.div`
  font-size: 12px;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.08);
  padding: 8px;
  border-radius: 6px;
  word-break: break-all;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: auto;
`;

const ActionButton = styled.button<{ primary?: boolean }>`
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: ${({ primary }) => (primary ? '#3b82f6' : 'rgba(255,255,255,0.08)')};
  color: #fff;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  &:disabled {
    cursor: not-allowed;
  }
`;
