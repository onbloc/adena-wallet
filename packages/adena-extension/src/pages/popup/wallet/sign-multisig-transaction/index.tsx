import { Account, isAirgapAccount, isLedgerAccount, MultisigConfig } from 'adena-module';
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
import { ContractMessage, MultisigTransactionDocument, Signature } from '@inject/types';
import { NetworkFee, RoutePath } from '@types';
import { convertRawGasAmountToDisplayAmount } from '@common/utils/gas-utils';

interface TransactionData {
  messages: readonly any[];
  contracts: { type: string; function: string; value: any }[];
  gasWanted: string;
  gasFee: string;
  memo: string;
}

/**
 * Convert Protobuf message (@type) to Amino message (type/value)
 */
function convertMessageToAmino(msg: any): { type: string; value: any } {
  if (msg.type && msg.value) {
    return msg;
  }
  const { '@type': type, ...value } = msg;
  return { type, value };
}

/**
 * Map MultisigTransactionDocument to TransactionData for UI
 */
function mappedTransactionData(doc: MultisigTransactionDocument): TransactionData {
  const messages = doc.tx.msg.map(convertMessageToAmino);

  return {
    messages,
    contracts: messages.map((message) => ({
      type: message?.type || '',
      function: message?.type === '/bank.MsgSend' ? 'Transfer' : message?.value?.func || '',
      value: message?.value || '',
    })),
    gasWanted: doc.tx.fee.gas_wanted,
    gasFee: doc.tx.fee.gas_fee,
    memo: doc.tx.memo || '',
  };
}

const SignMultisigTransactionContainer: React.FC = () => {
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
  const [multisigDocument, setMultisigDocument] = useState<MultisigTransactionDocument>();
  const [processType, setProcessType] = useState<'INIT' | 'PROCESSING' | 'DONE'>('INIT');
  const [response, setResponse] = useState<InjectionMessage | null>(null);
  const [memo, setMemo] = useState('');
  const { openScannerLink } = useLink();
  const [transactionMessages, setTransactionMessages] = useState<ContractMessage[]>([]);

  const { data: currentBalance = null } = useGetGnotBalance();

  const multisigConfig: MultisigConfig | null = useMemo(() => {
    return multisigDocument?.multisigConfig || null;
  }, [multisigDocument?.multisigConfig]);

  const rawNetworkFee: NetworkFee | null = useMemo(() => {
    if (!multisigDocument?.tx?.fee?.gas_fee) {
      return null;
    }

    // Parse "6113ugnot" -> { amount: "6113", denom: "ugnot" }
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

  const currentGasWanted = useMemo(() => {
    return multisigDocument?.tx.fee?.gas_wanted || '0';
  }, [multisigDocument?.tx.fee?.gas_wanted]);

  const processing = useMemo(() => processType !== 'INIT', [processType]);
  const done = useMemo(() => processType === 'DONE', [processType]);

  const signatures = useMemo(() => {
    return multisigDocument?.multisigSignatures || [];
  }, [multisigDocument?.multisigSignatures]);

  const hasMemo = useMemo(() => {
    return !!requestData?.data?.memo;
  }, [requestData?.data?.memo]);

  const consumedTokenAmount = useMemo(() => {
    const accumulatedAmount = multisigDocument?.tx?.msg.reduce((acc, msg) => {
      const amountStr = msg.send || msg.amount || msg.max_deposit;
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
  }, [multisigDocument]);

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
      const document = requestData.data as MultisigTransactionDocument;

      setMultisigDocument(document);
      setTransactionData(mappedTransactionData(document));
      setHostname(requestData?.hostname ?? '');
      setMemo(document.tx.memo);

      // Convert messages for display
      const aminoMessages = document.tx.msg.map(convertMessageToAmino);
      setTransactionMessages(mappedTransactionMessages(aminoMessages));

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

  const signMultisigTransaction = async (): Promise<boolean> => {
    if (!multisigDocument || !currentAccount) {
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
      // Convert to Amino Document format for signing
      const aminoMessages = multisigDocument.tx.msg.map(convertMessageToAmino);

      // Parse gas fee "6113ugnot" -> { amount: "6113", denom: "ugnot" }
      const gasFeeMatch = multisigDocument.tx.fee.gas_fee.match(/^(\d+)(\w+)$/);
      if (!gasFeeMatch) {
        throw new Error('Invalid gas fee format');
      }

      const aminoDocument = {
        msgs: aminoMessages,
        fee: {
          amount: [
            {
              amount: gasFeeMatch[1],
              denom: gasFeeMatch[2],
            },
          ],
          gas: multisigDocument.tx.fee.gas_wanted,
        },
        chain_id: multisigDocument.chainId,
        memo: multisigDocument.tx.memo,
        account_number: multisigDocument.accountNumber,
        sequence: multisigDocument.sequence,
      };

      // Sign using TransactionService
      const encodedSignature = await multisigService.createSignature(currentAccount, aminoDocument);

      // Convert to Multisig Signature format
      const signature: Signature = {
        pub_key: {
          type: '/tm.PubKeySecp256k1',
          value: encodedSignature.pubKey.value || '',
        },
        signature: encodedSignature.signature,
      };

      // Add signature to document
      const updatedDocument: MultisigTransactionDocument = {
        ...multisigDocument,
        multisigSignatures: [...(multisigDocument.multisigSignatures || []), signature],
      };

      setProcessType('PROCESSING');
      setResponse(
        InjectionMessageInstance.success(
          WalletResponseSuccessType.SIGN_MULTISIG_DOCUMENT_SUCCESS,
          {
            signedDocument: updatedDocument,
            addedSignature: signature,
          },
          requestData?.key,
        ),
      );

      return true;
    } catch (e) {
      console.log(e, 'e');
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
          requestData,
        },
      });
      return;
    }
    signMultisigTransaction().finally(() => setProcessType('DONE'));
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
      transactionData={JSON.stringify(multisigDocument, null, 2)}
    />
  );
};

export default SignMultisigTransactionContainer;
