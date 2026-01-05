import { Account, isMultisigAccount, MultisigConfig } from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { GasToken } from '@common/constants/token.constant';
import { mappedTransactionMessages } from '@common/mapper/transaction-mapper';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { validateInjectionDataWithAddress } from '@common/validation/validation-transaction';
import { CreateMultisigTransaction } from '@components/molecules/create-multisig-transaction';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import {
  ContractMessage,
  CreateMultisigTransactionParams,
  MultisigTransactionDocument,
} from '@inject/types';
import { NetworkFee, RoutePath } from '@types';
import { convertRawGasAmountToDisplayAmount } from '@common/utils/gas-utils';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
  document: MultisigTransactionDocument;
}

function mappedTransactionData(txDocument: MultisigTransactionDocument): TransactionData {
  const { tx } = txDocument;
  return {
    messages: tx.msgs,
    contracts: tx.msgs.map((message) => {
      return {
        type: message?.type || '',
        function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
        value: message?.value || '',
      };
    }),
    gasWanted: tx.fee.gas_wanted,
    gasFee: tx.fee.gas_fee,
    memo: tx.memo || '',
    document: txDocument,
  };
}

const CreateMultisigTransactionContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const { navigate } = useAppNavigate();
  const { gnoProvider } = useWalletContext();
  const { walletService, multisigService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [transactionData, setTransactionData] = useState<TransactionData>();
  const { currentNetwork } = useNetwork();
  const [hostname, setHostname] = useState('');
  const location = useLocation();
  const [requestData, setRequestData] = useState<InjectionMessage>();
  const [favicon, setFavicon] = useState<any>(null);
  const [visibleTransactionInfo, setVisibleTransactionInfo] = useState(false);
  const [txDocument, setTxDocument] = useState<MultisigTransactionDocument>();
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const { openScannerLink } = useLink();
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);

  const multisigConfig: MultisigConfig | null = useMemo(() => {
    if (!currentAccount || !isMultisigAccount(currentAccount)) return null;

    return currentAccount.multisigConfig;
  }, [currentAccount]);

  const rawNetworkFee: NetworkFee | null = useMemo(() => {
    if (!txDocument?.tx?.fee?.gas_fee) {
      return null;
    }

    const gasFee = txDocument.tx.fee.gas_fee;
    const amount = gasFee.replace(/[^0-9]/g, '');
    const denom = gasFee.replace(/[0-9]/g, '');

    return {
      amount,
      denom,
    };
  }, [txDocument?.tx?.fee]);

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
    return txDocument?.tx?.fee?.gas_wanted || '0';
  }, [txDocument?.tx?.fee?.gas_wanted]);

  const processing = useMemo(() => processType !== 'INIT', [processType]);

  const done = useMemo(() => processType === 'DONE', [processType]);

  const hasMemo = useMemo(() => {
    if (!requestData?.data?.memo) {
      return false;
    }
    return true;
  }, [requestData?.data?.memo]);

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
      if (!isMultisigAccount(currentAccount)) {
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
    if (
      !currentAccount ||
      !isMultisigAccount(currentAccount) ||
      !requestData ||
      !requestData?.data ||
      !currentNetwork
    ) {
      return false;
    }

    try {
      const data = await multisigService.createMultisigTransaction(
        requestData.data as CreateMultisigTransactionParams,
      );

      setTxDocument(data);
      setTransactionData(mappedTransactionData(data));
      setHostname(requestData?.hostname ?? '');
      setMemo(data.tx.memo);
      setTransactionMessages(mappedTransactionMessages(data.tx.msgs));

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
    if (!txDocument || !rawNetworkFee) {
      return;
    }

    const currentMemo = memo;

    const updatedTxDocument: MultisigTransactionDocument = {
      ...txDocument,
      tx: {
        ...txDocument.tx,
        memo: currentMemo,
        fee: {
          gas_wanted: currentGasWanted.toString(),
          gas_fee: `${rawNetworkFee.amount}${rawNetworkFee.denom}`,
        },
      },
    };

    setTxDocument(updatedTxDocument);
    setTransactionData(mappedTransactionData(updatedTxDocument));
  }, [txDocument, rawNetworkFee, memo, currentGasWanted]);

  const createMultisigTransaction = async (): Promise<boolean> => {
    if (!txDocument || !currentAccount) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          {},
          requestData?.key,
        ),
      );
      return false;
    }

    if (!isMultisigAccount(currentAccount)) {
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          { error: { message: 'Please switch to a multisig account and try again.' } },
          requestData?.key,
        ),
      );
      return false;
    }

    try {
      setProcessType('PROCESSING');

      const fileSaved = await multisigService.saveTransactionToFile(txDocument);

      if (!fileSaved) {
        setProcessType('INIT');
        return false;
      }

      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.CREATE_MULTISIG_TRANSACTION_SUCCESS,
          {
            tx: txDocument.tx,
            chainId: txDocument.chainId,
            accountNumber: txDocument.accountNumber,
            sequence: txDocument.sequence,
          },
          requestData?.key,
        ),
      );

      return true;
    } catch (e) {
      setProcessType('INIT');

      if (e instanceof Error) {
        const message = e.message;
        if (message.includes('Ledger')) {
          return false;
        }
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.CREATE_MULTISIG_TRANSACTION_FAILED,
            { error: { message } },
            requestData?.key,
          ),
        );
      } else {
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.CREATE_MULTISIG_TRANSACTION_FAILED,
            {},
            requestData?.key,
          ),
        );
      }
      return false;
    }
  };

  const onToggleTransactionData = (visibleTransactionInfo: boolean): void => {
    setVisibleTransactionInfo(visibleTransactionInfo);
  };

  const onClickConfirm = async (): Promise<void> => {
    if (!currentAccount || !txDocument) {
      return;
    }
    if (!isMultisigAccount(currentAccount)) {
      navigate(RoutePath.ApproveSignLoading, {
        state: {
          requestData,
        },
      });
      return;
    }

    const success = await createMultisigTransaction();

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

  useEffect(() => {
    if (transactionMessages.length === 0) {
      return;
    }

    updateTransactionData();
  }, [memo, transactionMessages]);

  return (
    <CreateMultisigTransaction
      title='Create New Transaction'
      domain={hostname}
      contracts={transactionData?.contracts || []}
      memo={memo}
      hasMemo={hasMemo}
      loading={transactionData === undefined}
      processing={processing}
      done={done}
      logo={favicon}
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
      transactionData={JSON.stringify(txDocument?.tx, null, 2)}
    />
  );
};

export default CreateMultisigTransactionContainer;
