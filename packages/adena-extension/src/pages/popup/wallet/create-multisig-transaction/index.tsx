import {
  Account,
  isMultisigAccount,
  MultisigConfig,
  RawBankSendMessage,
  RawTx,
  RawTxMessageType,
  RawVmAddPackageMessage,
  RawVmRunMessage,
} from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { GasToken } from '@common/constants/token.constant';
import {
  createFaviconByHostname,
  decodeParameter,
  parseParameters,
} from '@common/utils/client-utils';
import { convertRawGasAmountToDisplayAmount } from '@common/utils/gas-utils';
import { validateInjectionDataForMultisig } from '@common/validation/validation-transaction';
import { CreateMultisigTransaction } from '@components/molecules/create-multisig-transaction';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { NetworkFee, RoutePath } from '@types';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
}

function isBankSendMessage(message: RawTxMessageType): message is RawBankSendMessage {
  return message['@type'] === '/bank.MsgSend';
}

function isAddPackageMessage(message: RawTxMessageType): message is RawVmAddPackageMessage {
  return message['@type'] === '/vm.m_addpkg';
}

function isRunMessage(message: RawTxMessageType): message is RawVmRunMessage {
  return message['@type'] === '/vm.m_run';
}

function parseFunctionName(message: RawTxMessageType): string {
  if (isBankSendMessage(message)) {
    return 'Transfer';
  }
  if (isAddPackageMessage(message)) {
    return 'AddPackage';
  }
  if (isRunMessage(message)) {
    return 'Run';
  }
  return message.func;
}

function mappedTransactionData(rawTx: RawTx): TransactionData {
  const { msg, fee, memo } = rawTx;
  return {
    messages: msg,
    contracts: msg.map((message) => {
      return {
        type: message?.['@type'] || '',
        function: parseFunctionName(message),
        value: message,
      };
    }),
    gasWanted: fee.gas_wanted,
    gasFee: fee.gas_fee,
    memo: memo || '',
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
  const [tx, setTx] = useState<RawTx>();
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
    if (!tx?.fee?.gas_fee) {
      return null;
    }

    const gasFee = tx.fee.gas_fee;
    const amount = gasFee.replace(/[^0-9]/g, '');
    const denom = gasFee.replace(/[0-9]/g, '');

    return {
      amount,
      denom,
    };
  }, [tx?.fee]);

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
    return tx?.fee?.gas_wanted || '0';
  }, [tx?.fee?.gas_wanted]);

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
    const validationMessage = validateInjectionDataForMultisig(
      requestData,
      currentAccount,
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
      const messages = requestData.data.messages as ContractMessage[];
      const gas = requestData.data.fee;
      const data = await multisigService.createRawTransaction(
        messages,
        requestData.data?.memo || '',
        gas?.gasWanted || '',
        gas?.gasFee || '',
      );

      const transactionData = mappedTransactionData(data);

      setTx(data);
      setTransactionData(transactionData);
      setHostname(requestData?.hostname ?? '');
      setMemo(data.memo);
      setTransactionMessages(messages);

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
    if (!tx || !rawNetworkFee) {
      return;
    }

    const currentMemo = memo;

    const updatedTx: RawTx = {
      ...tx,
      memo: currentMemo,
      fee: {
        gas_wanted: currentGasWanted.toString(),
        gas_fee: `${rawNetworkFee.amount}${rawNetworkFee.denom}`,
      },
    };

    setTx(updatedTx);
    setTransactionData(mappedTransactionData(updatedTx));
  }, [tx, rawNetworkFee, memo, currentGasWanted]);

  const createMultisigTransaction = async (): Promise<boolean> => {
    if (!tx || !currentAccount) {
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

      const fileSaved = await multisigService.saveTransactionToFile(tx);

      if (!fileSaved) {
        setProcessType('INIT');
        return false;
      }

      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.CREATE_MULTISIG_TRANSACTION_SUCCESS,
          {
            tx: tx,
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
    if (!currentAccount || !tx) {
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
      title='Create Multi-sig Tx'
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
      transactionData={JSON.stringify(tx, null, 2)}
    />
  );
};

export default CreateMultisigTransactionContainer;
