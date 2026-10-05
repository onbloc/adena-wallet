import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import {
  isAirgapAccount,
  isLedgerAccount,
  isMultisigAccount,
  isSessionAccount,
} from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import UnknownLogo from '@assets/common-unknown-logo.svg';
import {
  createFaviconByHostname,
  decodeParameter,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import { Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';
import { useChain } from '@hooks/use-chain';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { createSessionAccountUnsupportedResponse } from '@inject/message/session-account-response';
import { SignArbitraryExecuteType, SignArbitraryParams } from '@inject/types';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import { RoutePath } from '@types';

// Same stand-in as the Cosmos pages use: the SDK's `WalletMessageInfo` has no
// SIGN_ARBITRARY row yet, so `InjectionMessageInstance.success/failure` would
// throw on destructure. Consolidate once the SDK catches up.
function createSignArbitraryResponse(
  status: 'success' | 'failure',
  key: string | undefined,
  data?: Record<string, unknown>,
  message = '',
): InjectionMessage {
  return {
    code: status === 'success' ? 0 : 1,
    key,
    type: SignArbitraryExecuteType.SIGN_ARBITRARY as unknown as WalletResponseType,
    status,
    message,
    data,
  };
}

const ApproveSignArbitraryContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService, transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const chain = useChain();

  const [key, setKey] = useState<string>('');
  const [hostname, setHostname] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('');
  const [favicon, setFavicon] = useState<string | null>(null);
  const [signer, setSigner] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    walletService
      .isLocked()
      .then((locked) => locked && navigate(RoutePath.ApproveLogin + location.search));
  }, [walletService]);

  // Refused for the same reason the Cosmos handlers refuse it: a SessionAccount
  // is a Gno-only sub-key, so signing with it would prove the session key while
  // the dApp believes the master address was proven. The background handler
  // rejects this too; the check is repeated here because the account is only
  // known for certain after unlock.
  useEffect(() => {
    if (!currentAccount || !key) return;
    if (isSessionAccount(currentAccount)) {
      chrome.runtime.sendMessage(createSessionAccountUnsupportedResponse(key));
      window.close();
    }
  }, [currentAccount, key]);

  // An airgap account holds no key here at all, which is what the shared
  // sign-failed screen explains. Matches approve-sign, approve-sign-transaction,
  // approve-transaction-main and sign-multisig-transaction.
  useEffect(() => {
    if (!currentAccount) return;
    if (isAirgapAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignFailed);
    }
  }, [currentAccount, navigate]);

  // A multisig account is a set of signers rather than one key, so `signRaw`
  // throws by design. The sign-failed screen above speaks only about airgap
  // accounts, so answer the dApp instead of showing the user the wrong reason.
  useEffect(() => {
    if (!currentAccount || !key) return;
    if (isMultisigAccount(currentAccount)) {
      chrome.runtime.sendMessage(
        createSignArbitraryResponse(
          'failure',
          key,
          undefined,
          WalletResponseFailureType.UNSUPPORTED_TYPE,
        ),
      );
      window.close();
    }
  }, [currentAccount, key]);

  // The dApp names the address it expects to sign with. Refuse before the
  // window is shown rather than on approval: a prompt that says signing proves
  // you control this address, while displaying one you do not, is misleading,
  // and approving it could never have produced a signature anyway.
  useEffect(() => {
    if (!currentAccount || !key || !signer) return;
    let cancelled = false;

    currentAccount.getAddress(chain.bech32Prefix).then((address) => {
      if (cancelled || address === signer) return;
      chrome.runtime.sendMessage(
        createSignArbitraryResponse(
          'failure',
          key,
          undefined,
          WalletResponseFailureType.ACCOUNT_MISMATCH,
        ),
      );
      window.close();
    });

    return () => {
      cancelled = true;
    };
  }, [currentAccount, key, signer, chain]);

  useEffect(() => {
    try {
      const params = parseParameters(location.search);
      setKey(params.key);
      setHostname(params.hostname);
      setProtocol(params.protocol);
      if (params.data) {
        const requestData = decodeParameter(params.data) as InjectionMessage | null;
        if (!requestData) return;
        const data = (requestData.data ?? {}) as SignArbitraryParams;
        setSigner(data.signer);
        setMessage(data.data);
      }
    } catch (error) {
      console.warn('[ApproveSignArbitrary] initRequest failed:', error);
    }
  }, [location]);

  useEffect(() => {
    if (!hostname) return;
    createFaviconByHostname(`${protocol}//${hostname}`)
      .then(setFavicon)
      .catch(() => setFavicon(null));
  }, [hostname, protocol]);

  const siteName = useMemo(() => getSiteName(protocol, hostname), [protocol, hostname]);

  const onClickCancel = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, key),
    );
    window.close();
  }, [key]);

  const onClickApprove = useCallback(async () => {
    if (!currentAccount || !currentNetwork || !signer || !message) {
      chrome.runtime.sendMessage(
        createSignArbitraryResponse(
          'failure',
          key,
          { error: 'Sign state not ready' },
          WalletResponseFailureType.UNEXPECTED_ERROR,
        ),
      );
      window.close();
      return;
    }

    if (isLedgerAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignArbitraryLedgerLoading, {
        state: {
          chainId: currentNetwork.networkId,
          signer,
          data: message,
          responseKey: key,
        },
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await transactionService.signArbitraryDoc(
        currentAccount.id,
        currentNetwork.networkId,
        signer,
        message,
      );
      chrome.runtime.sendMessage(createSignArbitraryResponse('success', key, { ...response }));
      window.close();
    } catch (error) {
      const detail = (error as Error)?.message ?? String(error);
      setErrorMessage(detail);
      setProcessing(false);
      chrome.runtime.sendMessage(
        createSignArbitraryResponse(
          'failure',
          key,
          { error: detail },
          WalletResponseFailureType.UNEXPECTED_ERROR,
        ),
      );
    }
  }, [currentAccount, currentNetwork, chain, signer, message, transactionService, key, navigate]);

  const approveDisabled = processing || !currentAccount || !currentNetwork || !message;

  return (
    <Wrapper>
      <Text className='main-title' type='header4'>
        Sign Message
      </Text>

      <div className='domain-wrapper'>
        <img className='logo' src={favicon || UnknownLogo} alt='logo img' />
        <span>{siteName || hostname}</span>
      </div>

      <div className='info-table'>
        <div className='row'>
          <span className='key'>Network</span>
          <span className='value'>{currentNetwork?.networkId || '—'}</span>
        </div>
        <div className='row'>
          <span className='key'>Fee</span>
          <span className='value'>None</span>
        </div>
      </div>

      <div className='block'>
        <span className='block-key'>Signing with</span>
        <span className='block-value'>{signer || '—'}</span>
      </div>

      <div className='block'>
        <span className='block-key'>Message</span>
        <pre className='message-pre'>{message}</pre>
      </div>

      <span className='notice'>
        Signing proves you control this address. It is not a transaction and moves no funds.
      </span>

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
          text: 'Sign',
          loading: processing,
          disabled: approveDisabled,
          onClick: onClickApprove,
        }}
      />
    </Wrapper>
  );
};

export default ApproveSignArbitraryContainer;

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

    .message-pre {
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
      word-break: break-word;
      color: ${getTheme('neutral', '_1')};
    }
  }

  .notice {
    width: 100%;
    padding: 0 4px;
    ${fonts.body2Reg};
    color: ${getTheme('neutral', 'a')};
  }

  .error-banner {
    width: 100%;
    min-height: 40px;
    padding: 10px 16px;
    border-radius: 18px;
    background-color: rgba(239, 45, 33, 0.08);
    border: 1px solid ${getTheme('red', '_5')};
    margin-top: 8px;
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
