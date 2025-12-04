import { Account, Document, isAirgapAccount, isLedgerAccount } from 'adena-module';
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
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';
import { ApproveSignedDocument } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useGetGnotBalance } from '@hooks/wallet/use-get-gnot-balance';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage, MultisigConfig, SignedDocument } from '@inject/types';
import { NetworkFee, RoutePath } from '@types';
import { convertRawGasAmountToDisplayAmount } from '@common/utils/gas-utils';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
  document: Document;
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

const ApproveSignDocumentContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate } = useAppNavigate();
  const { gnoProvider } = useWalletContext();
  const { walletService, transactionService, multisigService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const { currentNetwork } = useNetwork();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [document, setDocument] = useState<SignedDocument>();
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const { openScannerLink } = useLink();
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);

  const { data: currentBalance = null } = useGetGnotBalance();

  const multisigConfig: MultisigConfig | null = useMemo(() => {
    if (!document?.multisigConfig) return null;

    return {
      signers: document.multisigConfig.signers,
      threshold: document.multisigConfig.threshold,
    };
  }, [document?.multisigConfig]);

  const rawNetworkFee: NetworkFee | null = useMemo(() => {
    if (!document?.fee?.amount?.[0]) {
      return null;
    }

    const feeAmount = document.fee.amount[0];

    return {
      amount: feeAmount.amount,
      denom: feeAmount.denom,
    };
  }, [document?.fee]);

  const networkFee: NetworkFee | null = useMemo(() => {
    if (!rawNetworkFee) {
      return null;
    }

    const networkFeeAmount = convertRawGasAmountToDisplayAmount(rawNetworkFee.amount);

    return {
      amount: networkFeeAmount,
      denom: GasToken.symbol,
    };
  }, [rawNetworkFee]);

  const displayNetworkFee: NetworkFee = useMemo(() => {
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

  const currentGasWanted = useMemo(() => {
    return document?.fee?.gas || '0';
  }, [document?.fee?.gas]);

  const processing = useMemo(() => processType !== 'INIT', [processType]);

  const done = useMemo(() => processType === 'DONE', [processType]);

  const signatures = useMemo(() => {
    return document?.signatures || [];
  }, [document?.signatures]);

  const hasMemo = useMemo(() => {
    if (!requestData?.data?.memo) {
      return false;
    }
    return true;
  }, [requestData?.data?.memo]);

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

  const isNetworkFeeLoading = useMemo(() => {
    return rawNetworkFee === null;
  }, [rawNetworkFee]);

  const isErrorNetworkFee = useMemo(() => {
    if (isNetworkFeeLoading) {
      return false;
    }

    if (!networkFee) {
      return true;
    }

    const resultConsumedAmount = BigNumber(consumedTokenAmount).plus(networkFee.amount);

    return BigNumber(currentBalance || 0)
      .shiftedBy(GasToken.decimals * -1)
      .isLessThan(resultConsumedAmount);
  }, [isNetworkFeeLoading, networkFee, currentBalance, consumedTokenAmount]);

  const argumentInfos: GnoArgumentInfo[] = useMemo(() => {
    return requestData?.data?.arguments || [];
  }, [requestData?.data?.arguments]);

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
    const validationMessage = validateInjectionDataWithAddress(
      requestData,
      await currentAccount.getAddress('g'),
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
    if (!currentAccount || !requestData || !currentNetwork || !requestData?.data) {
      return false;
    }

    try {
      const document = await multisigService.createSignedDocument(
        currentNetwork.chainId,
        requestData.data as SignedDocument,
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

  const updateTransactionData = useCallback((): void => {
    if (!document || !rawNetworkFee) {
      return;
    }

    const currentMemo = memo;

    const updatedSignedDocument: SignedDocument = {
      ...document,
      memo: currentMemo,
      fee: {
        amount: [
          {
            amount: rawNetworkFee.amount.toString(),
            denom: GasToken.denom,
          },
        ],
        gas: currentGasWanted.toString(),
      },
    };

    setDocument(updatedSignedDocument);
    setTransactionData(mappedTransactionData(updatedSignedDocument));
  }, [document, rawNetworkFee, memo, currentGasWanted]);

  const createSignDocument = async (): Promise<boolean> => {
    if (!document || !currentAccount) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return false;
    }

    try {
      const signature = await transactionService.createSignature(currentAccount, document);

      const updateSignedDocument = {
        ...document,
        signatures: [...document.signatures, signature],
      };
      setProcessType('PROCESSING');
      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.SIGN_MULTISIG_DOCUMENT_SUCCESS,
          {
            document: updateSignedDocument,
            signature,
          },
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
            WalletResponseFailureType.SIGN_MULTISIG_DOCUMENT_FAILED,
            { error: { message } },
            requestData?.key,
          ),
        );
      }
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.SIGN_MULTISIG_DOCUMENT_FAILED,
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
    if (isLedgerAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignLoading, {
        state: {
          document,
          requestData,
        },
      });
      return;
    }
    createSignDocument().finally(() => setProcessType('DONE'));
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
  }, [memo, transactionMessages]);

  return (
    <ApproveSignedDocument
      title='Sign Document'
      domain={hostname}
      contracts={transactionData?.contracts || []}
      signatures={signatures}
      memo={memo}
      hasMemo={hasMemo}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
      logo={favicon}
      currentBalance={currentBalance || 0}
      isErrorNetworkFee={isErrorNetworkFee}
      isNetworkFeeLoading={isNetworkFeeLoading}
      networkFee={displayNetworkFee}
      multisigConfig={multisigConfig}
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
    />
  );
};

export default ApproveSignDocumentContainer;
