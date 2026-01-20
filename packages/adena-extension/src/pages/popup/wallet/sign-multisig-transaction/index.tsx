import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { GasToken } from '@common/constants/token.constant';
import { mappedRawTxMessages } from '@common/mapper/transaction-mapper';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { convertRawGasAmountToDisplayAmount } from '@common/utils/gas-utils';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';
import { ApproveSignedDocument } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage, MultisigTransactionDocument, Signature } from '@inject/types';
import { NetworkFee, RoutePath } from '@types';
import { Account, isAirgapAccount, isLedgerAccount } from 'adena-module';

interface SignMultisigTransactionRequestData {
  multisigDocument: MultisigTransactionDocument;
  multisigSignatures?: Signature[];
}

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
}

/**
 * Map MultisigTransactionDocument to TransactionData for UI
 */
function mappedTransactionData(txDocument: MultisigTransactionDocument): TransactionData {
  const { tx } = txDocument;
  return {
    messages: tx.msg,
    contracts: tx.msg.map((message: any) => {
      const messageType = message?.['@type'];
      let functionName = '';
      if (messageType === '/bank.MsgSend') {
        functionName = 'Transfer';
      } else if (messageType === '/vm.m_call') {
        functionName = message?.func || '';
      }
      return {
        type: messageType,
        function: functionName,
        value: message || '',
      };
    }),
    gasWanted: tx.fee.gas_wanted,
    gasFee: tx.fee.gas_fee,
    memo: tx.memo || '',
  };
}

const SignMultisigTransactionContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate } = useAppNavigate();
  const { gnoProvider } = useWalletContext();
  const { walletService, multisigService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const location = useLocation();
  const { openScannerLink } = useLink();

  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const [multisigDocument, setMultisigDocument] = useState<MultisigTransactionDocument>();
  const [multisigSignatures, setMultisigSignatures] = useState<Signature[]>([]);
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);
  const [memo, setMemo] = useState('');

  const [hostname, setHostname] = useState('');
  const [favicon, setFavicon] = useState<any>(null);
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);

  const rawNetworkFee: NetworkFee | null = useMemo(() => {
    if (!multisigDocument?.tx?.fee?.gas_fee) {
      return null;
    }

    const gasFee = multisigDocument.tx.fee.gas_fee;
    const match = gasFee.match(/^(\d+)(\w+)$/);

    if (!match) {
      return null;
    }

    return {
      amount: match[1],
      denom: match[2],
    };
  }, [multisigDocument?.tx?.fee]);

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
      return { amount: '', denom: '' };
    }

    return {
      amount: networkFee.amount,
      denom: GasToken.symbol,
    };
  }, [networkFee]);

  const processing = useMemo(() => processType !== 'INIT', [processType]);
  const done = useMemo(() => processType === 'DONE', [processType]);

  const hasMemo = useMemo(() => {
    return !!requestData?.data?.tx?.memo;
  }, [requestData?.data?.tx?.memo]);

  const isNetworkFeeLoading = useMemo(() => {
    return rawNetworkFee === null;
  }, [rawNetworkFee]);

  const isErrorNetworkFee = useMemo(() => {
    if (!networkFee) {
      return true;
    }

    if (isNetworkFeeLoading) {
      return false;
    }

    return false;
  }, [isNetworkFeeLoading, networkFee]);

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
      true,
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
      const data = requestData.data as SignMultisigTransactionRequestData;
      const { multisigDocument, multisigSignatures = [] } = data;

      setMultisigDocument(multisigDocument);
      setMultisigSignatures(multisigSignatures);
      setTransactionData(mappedTransactionData(multisigDocument));
      setHostname(requestData?.hostname ?? '');
      setMemo(multisigDocument.tx.memo);
      setTransactionMessages(mappedRawTxMessages(data.multisigDocument.tx.msg));

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

  const signMultisigTransaction = async (): Promise<boolean> => {
    if (!multisigDocument || !currentAccount || !currentAddress) {
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
      setProcessType('PROCESSING');

      const newSignature = await multisigService.signMultisigTransaction(
        currentAccount,
        currentAddress,
        currentNetwork?.chainId ?? '',
        multisigDocument.tx,
        multisigDocument.accountNumber,
        multisigDocument.sequence,
      );

      const fileSaved = await multisigService.saveSignatureToFile(newSignature);
      if (!fileSaved) {
        setProcessType('INIT');
        return false;
      }

      const updatedSignatures = [...multisigSignatures, newSignature];

      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.SIGN_MULTISIG_TRANSACTION_SUCCESS,
          {
            result: { multisigDocument: multisigDocument, multisigSignatures: updatedSignatures },
            signature: newSignature,
          },
          requestData?.key,
        ),
      );

      setProcessType('DONE');
      return true;
    } catch (e) {
      setProcessType('DONE');
      handleSignError(e);
      return false;
    }
  };

  const handleSignError = (e: unknown): void => {
    if (e instanceof Error) {
      const message = e.message;
      if (message.includes('Ledger')) {
        return;
      }

      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.SIGN_MULTISIG_TRANSACTION_FAILED,
          { error: { message } },
          requestData?.key,
        ),
      );
      return;
    }

    setResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.SIGN_MULTISIG_TRANSACTION_FAILED,
        { error: { message: 'Unknown error occurred' } },
        requestData?.key,
      ),
    );
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean): void => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = async (): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    if (isLedgerAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignLoading, {
        state: {
          requestData,
        },
      });
      return;
    }

    const success = await signMultisigTransaction();
    if (success) {
      setProcessType('DONE');
    }
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

  return (
    <ApproveSignedDocument
      title='Sign Multisig Transaction'
      domain={hostname}
      contracts={transactionData?.contracts || []}
      signatures={[]}
      memo={memo}
      hasMemo={hasMemo}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
      logo={favicon}
      isErrorNetworkFee={isErrorNetworkFee}
      isNetworkFeeLoading={isNetworkFeeLoading}
      networkFee={displayNetworkFee}
      transactionMessages={transactionMessages}
      argumentInfos={argumentInfos}
      onClickConfirm={onClickConfirm}
      onClickCancel={onClickCancel}
      onResponse={onResponseSignTransaction}
      onTimeout={onTimeoutSignTransaction}
      onToggleTransactionData={onToggleTransactionData}
      openScannerLink={openScannerLink}
      opened={visibleTransactionInfo}
      transactionData={JSON.stringify(multisigDocument, null, 2)}
    />
  );
};

export default SignMultisigTransactionContainer;
