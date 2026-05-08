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

import UnknownLogo from '@assets/common-unknown-logo.svg';
import { Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';
import {
  createFaviconByHostname,
  decodeParameter,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import {
  deserializeSignDoc,
  serializeSignDoc,
} from '@common/utils/cosmos-serialize';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
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
  const [favicon, setFavicon] = useState<string | null>(null);
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

  useEffect(() => {
    if (!hostname) return;
    createFaviconByHostname(`${protocol}//${hostname}`)
      .then(setFavicon)
      .catch(() => setFavicon(null));
  }, [hostname, protocol]);

  const siteName = useMemo(() => getSiteName(protocol, hostname), [protocol, hostname]);
  const responseType = useMemo<CosmosResponseExecuteType>(
    () =>
      mode === 'direct'
        ? CosmosResponseExecuteType.SIGN_COSMOS_DIRECT
        : CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
    [mode],
  );

  const modeLabel = useMemo(() => {
    if (mode === 'direct') return 'SIGN_MODE_DIRECT';
    if (mode === 'amino') return 'SIGN_MODE_LEGACY_AMINO_JSON';
    return '—';
  }, [mode]);

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

  const approveDisabled = processing || !mode || !currentAccount;

  return (
    <Wrapper>
      <Text className='main-title' type='header4'>
        Sign Cosmos Transaction
      </Text>

      <div className='domain-wrapper'>
        <img className='logo' src={favicon || UnknownLogo} alt='logo img' />
        <span>{siteName || hostname}</span>
      </div>

      <div className='info-table'>
        <div className='row'>
          <span className='key'>Mode</span>
          <span className='value'>{modeLabel}</span>
        </div>
        <div className='row'>
          <span className='key'>Chain</span>
          <span className='value'>{chainId || '—'}</span>
        </div>
      </div>

      <div className='block'>
        <span className='block-key'>Signer</span>
        <span className='block-value'>{signer || '—'}</span>
      </div>

      <div className='block'>
        <span className='block-key'>SignDoc (raw)</span>
        <pre className='raw-pre'>{prettySignDoc}</pre>
      </div>

      {errorMessage && (
        <div className='error-banner'>
          <span className='error-label'>ERROR:&nbsp;</span>
          <span className='error-text'>{errorMessage}</span>
        </div>
      )}

      <BottomFixedLoadingButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          text: 'Approve',
          loading: processing,
          disabled: approveDisabled,
          onClick: onClickApprove,
        }}
      />
    </Wrapper>
  );
};

export default ApproveSignCosmosContainer;

const Wrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  padding: 0 20px 96px 20px;
  align-self: center;

  .main-title {
    text-overflow: ellipsis;
    margin-top: 24px;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }

  .domain-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin: 24px auto 12px auto;
    gap: 7px;
    background-color: ${getTheme('neutral', '_9')};
    ${fonts.body2Reg};

    .logo {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    margin-bottom: 8px;
    background-color: ${getTheme('neutral', '_9')};
  }

  .row {
    ${mixins.flex({ direction: 'row' })};
    position: relative;
    padding: 10px 18px;
    justify-content: space-between;
    border-bottom: 2px solid ${getTheme('neutral', '_8')};
    ${fonts.body1Reg};

    &:last-child {
      border-bottom: none;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${getTheme('neutral', 'a')};
    }

    .value {
      display: block;
      max-width: 204px;
      text-align: right;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  .block {
    ${mixins.flex({ direction: 'column', align: 'flex-start' })};
    width: 100%;
    padding: 12px 18px;
    border-radius: 18px;
    background-color: ${getTheme('neutral', '_9')};
    margin-bottom: 8px;
    gap: 6px;

    .block-key {
      ${fonts.body2Reg};
      color: ${getTheme('neutral', 'a')};
    }

    .block-value {
      ${fonts.body2Reg};
      width: 100%;
      word-break: break-all;
      color: ${getTheme('neutral', '_1')};
    }

    .raw-pre {
      width: 100%;
      max-height: 240px;
      overflow-y: auto;
      margin: 0;
      padding: 10px 12px;
      border-radius: 12px;
      background-color: ${getTheme('neutral', '_8')};
      border: 1px solid ${getTheme('neutral', '_7')};
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 11px;
      line-height: 16px;
      white-space: pre-wrap;
      word-break: break-all;
      color: ${getTheme('neutral', '_1')};
    }
  }

  .error-banner {
    width: 100%;
    min-height: 40px;
    padding: 10px 16px;
    border-radius: 18px;
    background-color: rgba(239, 45, 33, 0.08);
    border: 1px solid ${getTheme('red', '_5')};
    margin-bottom: 8px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 13px;
    line-height: 20px;
    color: ${getTheme('red', '_5')};
    word-break: break-word;

    .error-label {
      font-weight: 700;
    }
  }
`;
