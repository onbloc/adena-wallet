import { Account, Document, isAirgapAccount, isLedgerAccount, isSessionAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { GasToken } from '@common/constants/token.constant';
import { mappedTransactionMessages } from '@common/mapper/transaction-mapper';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { getDappVisibleAddress } from '@common/utils/account-address';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';
import { ApproveTransaction } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useChain } from '@hooks/use-chain';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useGetGnotBalance } from '@hooks/wallet/use-get-gnot-balance';
import { useConvertSessionAccounts } from '@hooks/wallet/use-convert-session-accounts';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { SessionMetadataV020 } from '@migrates/migrations/v020/storage-model-v020';
import {
  evaluateSessionSigningGuard,
  SessionSigningFailReason,
  SessionSigningGuardDecision,
} from '@services/transaction/session-signing-guard';
import { RoutePath } from '@types';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
  document: Document;
}

// Maps internal SessionSigningFailReason to a user-facing Korean string.
// Phase 8 will polish copy and styling; this is the minimal banner text.
function mapSessionGuardReasonToMessage(reason: SessionSigningFailReason): string {
  switch (reason) {
    case 'wallet_locked':
      return '지갑이 잠겨 있어 세션 서명을 할 수 없습니다. 잠금을 해제하세요.';
    case 'not_session_account':
      return '세션 계정이 아니어서 세션 서명을 할 수 없습니다.';
    case 'session_admin_msg':
      return '세션 생성/취소 메시지는 세션 계정으로 서명할 수 없습니다. master 계정으로 전환하세요.';
    case 'session_metadata_missing':
      return '세션 정보를 찾을 수 없습니다. master 계정으로 전환한 뒤 다시 시도하세요.';
    case 'session_inactive':
      return '세션이 활성 상태가 아닙니다.';
    case 'chain_mismatch':
      return '현재 네트워크가 세션이 발급된 네트워크와 다릅니다.';
    case 'session_expired':
      return '세션이 만료되어 서명할 수 없습니다. master 계정으로 전환한 뒤 다시 시도하세요.';
    case 'unsupported_msg_type':
      return '이 트랜잭션 종류는 세션으로 서명할 수 없습니다.';
    case 'allowpaths_violation':
      return '세션 허용 경로에 포함되지 않은 호출입니다.';
    case 'spendlimit_exceeded':
      return '세션 사용 한도를 초과합니다.';
    default:
      return '세션 서명 조건을 만족하지 않아 서명할 수 없습니다.';
  }
}

function mappedTransactionData(document: Document): TransactionData {
  return {
    messages: document.msgs,
    contracts: document.msgs.map((message) => {
      return {
        type: message?.type || '',
        function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
        value: message?.value || '',
      };
    }),
    gasWanted: document.fee.gas,
    gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
    memo: `${document.memo || ''}`,
    document,
  };
}

const ApproveSignTransactionContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { wallet, gnoProvider } = useWalletContext();
  const { navigate } = useAppNavigate();
  const { walletService, transactionService, sessionRepository } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { convertBySessionAddresses } = useConvertSessionAccounts();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const { currentNetwork } = useNetwork();
  const chain = useChain();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<Document>();
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);
  const [sessionGuardDecision, setSessionGuardDecision] =
    useState<SessionSigningGuardDecision | null>(null);
  const { openScannerLink } = useLink();
  const { data: currentBalance = null } = useGetGnotBalance();

  const useNetworkFeeReturn = useNetworkFee(document, true);
  const networkFee = useNetworkFeeReturn.networkFee;

  const processing = useMemo(() => processType !== 'INIT', [processType]);

  const done = useMemo(() => processType === 'DONE', [processType]);

  const hasMemo = useMemo(() => {
    if (!requestData?.data?.memo) {
      return false;
    }
    return true;
  }, [requestData?.data?.memo]);

  const displayNetworkFee = useMemo(() => {
    if (!networkFee) {
      return {
        amount: '',
        denom: '',
      };
    }

    return {
      amount: networkFee.amount,
      denom: GasToken.symbol,
    };
  }, [networkFee]);

  const consumedTokenAmount = useMemo(() => {
    const accumulatedAmount = document?.msgs.reduce((acc, msg) => {
      const messageValue = msg.value;
      const amountStr = messageValue?.amount || messageValue?.amount || messageValue?.max_deposit;
      if (!amountStr) {
        return acc;
      }

      try {
        const amount = parseTokenAmount(amountStr);
        return BigNumber(acc).plus(amount).toNumber();
      } catch {
        return acc;
      }
    }, 0);

    const consumedBN = BigNumber(accumulatedAmount || 0).shiftedBy(GasToken.decimals * -1);
    return consumedBN.toNumber();
  }, [document]);

  const isErrorNetworkFee = useMemo(() => {
    if (!networkFee) {
      return false;
    }

    const resultConsumedAmount = BigNumber(consumedTokenAmount).plus(networkFee.amount);

    return BigNumber(currentBalance || 0)
      .shiftedBy(GasToken.decimals * -1)
      .isLessThan(resultConsumedAmount);
  }, [networkFee?.amount, currentBalance, consumedTokenAmount]);

  const argumentInfos: GnoArgumentInfo[] = useMemo(() => {
    return requestData?.data?.arguments || [];
  }, [requestData?.data?.arguments]);

  const sessionGuardBannerMessage = useMemo<string | null>(() => {
    if (!sessionGuardDecision || sessionGuardDecision.ok) {
      return null;
    }
    return mapSessionGuardReasonToMessage(sessionGuardDecision.reason);
  }, [sessionGuardDecision]);

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && normalNavigate(RoutePath.ApproveLogin + location.search));
  };

  useEffect(() => {
    if (location.search) {
      initRequestData();
    }
  }, [location]);

  const initRequestData = (): void => {
    const data = parseParameters(location.search);
    const parsedData = decodeParameter(data['data']);
    setRequestData({ ...parsedData, hostname: data['hostname'] });
  };

  useEffect(() => {
    if (currentAccount && requestData && gnoProvider) {
      if (isAirgapAccount(currentAccount)) {
        navigate(RoutePath.ApproveSignFailed);
        return;
      }

      validate(currentAccount, requestData).then((validated) => {
        if (validated) {
          initFavicon();
          initTransactionData();
        }
      });
    }
  }, [currentAccount, requestData, gnoProvider]);

  const validate = async (
    currentAccount: Account,
    requestData: InjectionMessage,
  ): Promise<boolean> => {
    const visibleAddress = await getDappVisibleAddress(currentAccount, chain.bech32Prefix);
    const validationMessage = validateInjectionDataWithAddress(
      requestData,
      visibleAddress,
    );
    if (validationMessage) {
      chrome.runtime.sendMessage(validationMessage);
      return false;
    }
    return true;
  };

  const initFavicon = async (): Promise<void> => {
    const faviconData = await createFaviconByHostname(
      requestData?.hostname ? `${requestData?.protocol}//${requestData?.hostname}` : '',
    );
    setFavicon(faviconData);
  };

  const initTransactionData = async (): Promise<boolean> => {
    if (!currentAccount || !requestData || !currentNetwork) {
      return false;
    }
    try {
      const document = await transactionService.createDocument(
        currentAccount,
        currentNetwork.networkId,
        requestData?.data?.messages,
        chain.bech32Prefix,
        requestData?.data?.gasWanted,
        requestData?.data?.gasFee,
        requestData?.data?.memo,
      );
      setDocument(document);
      setTransactionData(mappedTransactionData(document));
      setHostname(requestData?.hostname ?? '');
      setMemo(document.memo);
      setTransactionMessages(mappedTransactionMessages(document.msgs));
      return true;
    } catch (e) {
      console.error(e);
      const error: any = e;
      if (
        currentAccount &&
        isSessionAccount(currentAccount) &&
        error?.message?.startsWith('Session not found:')
      ) {
        const sessionAddr = await currentAccount.getAddress(chain.bech32Prefix).catch(() => null);
        if (sessionAddr) {
          await convertBySessionAddresses([sessionAddr]);
        }
        setSessionGuardDecision({ ok: false, reason: 'session_inactive' });
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.SIGN_FAILED,
            { error: { message: 'Session was revoked and converted to a regular account.' } },
            requestData?.key,
          ),
        );
        return false;
      }
      if (error?.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(
            WalletResponseRejectType.SIGN_REJECTED,
            requestData?.data,
            requestData?.key,
          ),
        );
      }
    }
    return false;
  };

  const changeMemo = (memo: string): void => {
    setMemo(memo);
  };

  const updateTransactionData = (): void => {
    if (!document) {
      return;
    }

    const currentMemo = memo;
    const currentGasPrice = useNetworkFeeReturn.currentGasFeeRawAmount;
    const currentGasWanted = useNetworkFeeReturn.currentGasInfo?.gasWanted || 0;

    const updatedDocument: Document = {
      ...document,
      memo: currentMemo,
      fee: {
        amount: [
          {
            amount: currentGasPrice.toString(),
            denom: GasToken.denom,
          },
        ],
        gas: currentGasWanted.toString(),
      },
    };

    setDocument(updatedDocument);
    setTransactionData(mappedTransactionData(updatedDocument));
  };

  const signTransaction = async (): Promise<boolean> => {
    if (!document || !currentAccount || !wallet) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return false;
    }

    // Session race-condition re-check: between popup load and confirm
    // click, the session may have expired or another tab may have pushed
    // spendUsed over the limit. Re-evaluate the guard right before signing
    // and abort if it no longer passes.
    if (isSessionAccount(currentAccount) && currentNetwork) {
      try {
        const sessionAddr = await currentAccount.getAddress(chain.bech32Prefix);
        const metadata = await sessionRepository.get(sessionAddr);
        const walletLocked = await walletService.isLocked();
        const decision = evaluateSessionSigningGuard({
          currentAccount,
          sessionMetadata: metadata,
          walletLocked,
          nowSeconds: Math.floor(Date.now() / 1000),
          currentChainId: currentNetwork.chainId,
          decodedMessages: document.msgs as { type: string; value: any }[],
          txFee: {
            amount: document.fee.amount[0]?.amount ?? '0',
            denom: document.fee.amount[0]?.denom ?? GasToken.denom,
          },
        });
        if (decision.ok === false) {
          setSessionGuardDecision(decision);
          setResponse(
            InjectionMessageInstance.failure(
              WalletResponseRejectType.SIGN_REJECTED,
              { sessionGuardReason: decision.reason },
              requestData?.key,
            ),
          );
          return false;
        }
      } catch {
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseRejectType.SIGN_REJECTED,
            { sessionGuardReason: 'session_metadata_missing' as SessionSigningFailReason },
            requestData?.key,
          ),
        );
        return false;
      }
    }

    try {
      setProcessType('PROCESSING');
      const { signed } = await transactionService.createTransaction(
        wallet,
        currentAccount,
        document,
      );
      const encodedTransaction = transactionService.encodeTransaction(signed);
      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.SIGN_SUCCESS,
          { encodedTransaction },
          requestData?.key,
        ),
      );
    } catch (e) {
      if (e instanceof Error) {
        const message = e.message;
        if (message.includes('Ledger')) {
          return false;
        }
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.SIGN_FAILED,
            { error: { message } },
            requestData?.key,
          ),
        );
      }
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.SIGN_FAILED,
          {},
          requestData?.key,
        ),
      );
    }
    return false;
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean): void => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = (): void => {
    if (!currentAccount) {
      return;
    }
    // SessionAccount: refuse to sign if the guard rejected this request.
    // The popup banner displays the reason; clicking confirm in that state
    // is treated as a fast SIGN_REJECTED to the dApp (no fallback to master
    // key per Phase 5 policy).
    if (
      isSessionAccount(currentAccount) &&
      sessionGuardDecision &&
      sessionGuardDecision.ok === false
    ) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseRejectType.SIGN_REJECTED,
          { sessionGuardReason: sessionGuardDecision.reason },
          requestData?.key,
        ),
      );
      setProcessType('DONE');
      return;
    }
    if (isLedgerAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignTransactionLoading, {
        state: {
          document,
          requestData,
        },
      });
      return;
    }
    signTransaction().finally(() => setProcessType('DONE'));
  };

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseRejectType.SIGN_REJECTED,
        {},
        requestData?.key,
      ),
    );
  };

  const onResponseSignTransaction = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
  }, [response]);

  const onTimeoutSignTransaction = useCallback(() => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NETWORK_TIMEOUT,
        {},
        requestData?.key,
      ),
    );
  }, [requestData]);

  useEffect(() => {
    if (transactionMessages.length === 0) {
      return;
    }

    updateTransactionData();
  }, [
    memo,
    transactionMessages,
    useNetworkFeeReturn.currentGasInfo?.gasWanted,
    useNetworkFeeReturn.currentGasFeeRawAmount,
  ]);

  // SessionAccount guard: evaluate once document + sessionMetadata + chainId
  // are ready. For non-session accounts the existing popup flow stays
  // unchanged; only sessions go through the guard.
  useEffect(() => {
    if (!currentAccount || !document || !currentNetwork) {
      return;
    }
    if (!isSessionAccount(currentAccount)) {
      setSessionGuardDecision(null);
      return;
    }

    let cancelled = false;
    const evaluate = async (): Promise<void> => {
      const sessionAddr = await currentAccount.getAddress(chain.bech32Prefix);
      const metadata: SessionMetadataV020 | null = await sessionRepository.get(sessionAddr);
      const walletLocked = await walletService.isLocked();
      const decision = evaluateSessionSigningGuard({
        currentAccount,
        sessionMetadata: metadata,
        walletLocked,
        nowSeconds: Math.floor(Date.now() / 1000),
        currentChainId: currentNetwork.chainId,
        decodedMessages: document.msgs as {
          type: string;
          value: any;
        }[],
        txFee: {
          amount: document.fee.amount[0]?.amount ?? '0',
          denom: document.fee.amount[0]?.denom ?? GasToken.denom,
        },
      });
      if (!cancelled) {
        setSessionGuardDecision(decision);
      }
    };

    evaluate().catch(() => {
      // On evaluation failure we conservatively block the session path.
      if (!cancelled) {
        setSessionGuardDecision({ ok: false, reason: 'session_metadata_missing' });
      }
    });

    return (): void => {
      cancelled = true;
    };
  }, [
    currentAccount,
    document,
    currentNetwork,
    chain.bech32Prefix,
    sessionRepository,
    walletService,
  ]);

  return (
    <ApproveTransaction
      title='Sign Transaction'
      domain={hostname}
      contracts={transactionData?.contracts || []}
      memo={memo}
      hasMemo={hasMemo}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
      logo={favicon}
      currentBalance={currentBalance || 0}
      isErrorNetworkFee={isErrorNetworkFee || !networkFee}
      networkFee={displayNetworkFee}
      useNetworkFeeReturn={useNetworkFeeReturn}
      transactionMessages={transactionMessages}
      argumentInfos={argumentInfos}
      changeTransactionMessages={setTransactionMessages}
      changeMemo={changeMemo}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onResponse={onResponseSignTransaction}
      onTimeout={onTimeoutSignTransaction}
      onToggleTransactionData={onToggleTransactionData}
      openScannerLink={openScannerLink}
      opened={visibleTransactionInfo}
      transactionData={JSON.stringify(document, null, 2)}
      sessionGuardBannerMessage={sessionGuardBannerMessage}
    />
  );
};

export default ApproveSignTransactionContainer;
