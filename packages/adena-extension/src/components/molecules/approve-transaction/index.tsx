import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';

import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import NetworkFeeSetting from '@components/pages/network-fee-setting/network-fee-setting/network-fee-setting';
import { UseNetworkFeeReturn } from '@hooks/wallet/use-network-fee';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { NetworkFee as NetworkFeeType } from '@types';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import ApproveTransactionMessageBox from '../approve-transaction-message-box/approve-transaction-message-box';
import NetworkFee from '../network-fee/network-fee';
import StorageDeposit from '../storage-deposit/storage-deposit';
import {
  ApproveTransactionNetworkFeeWrapper,
  ApproveTransactionWrapper,
} from './approve-transaction.styles';

export interface ApproveTransactionProps {
  loading: boolean;
  title: string;
  logo: string;
  domain: string;
  contracts: {
    type: string;
    function: string;
    value: string;
  }[];
  memo: string;
  hasMemo: boolean;
  currentBalance?: number;
  isErrorNetworkFee?: boolean;
  networkFee: NetworkFeeType | null;
  transactionData: string;
  opened: boolean;
  argumentInfos?: GnoArgumentInfo[];
  processing: boolean;
  done: boolean;
  transactionMessages: ContractMessage[];
  maxDepositAmount?: number;
  changeTransactionMessages: (messages: ContractMessage[]) => void;
  changeMemo: (memo: string) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  onToggleTransactionData: (opened: boolean) => void;
  onResponse: () => void;
  onTimeout: () => void;
  onClickConfirm: () => void;
  onClickCancel: () => void;
  useNetworkFeeReturn: UseNetworkFeeReturn;
  requiresHoldConfirmation?: boolean;
  onFinishHold?: (finished: boolean) => void;
}

export const ApproveTransaction: React.FC<ApproveTransactionProps> = ({
  loading,
  title,
  logo,
  domain,
  transactionMessages,
  memo,
  currentBalance,
  hasMemo,
  networkFee,
  isErrorNetworkFee,
  transactionData,
  opened,
  processing,
  done,
  useNetworkFeeReturn,
  argumentInfos,
  maxDepositAmount,
  changeTransactionMessages,
  changeMemo,
  onToggleTransactionData,
  onResponse,
  onClickConfirm,
  onClickCancel,
  openScannerLink,
  requiresHoldConfirmation = false,
  onFinishHold,
}) => {
  const [openedNetworkFeeSetting, setOpenedNetworkFeeSetting] = useState(false);

  const disabledApprove = useMemo(() => {
    if (requiresHoldConfirmation) {
      return true;
    }

    if (useNetworkFeeReturn.isLoading) {
      return true;
    }

    if (isErrorNetworkFee || useNetworkFeeReturn.isSimulateError) {
      return true;
    }

    return Number(networkFee?.amount || 0) <= 0;
  }, [
    requiresHoldConfirmation,
    isErrorNetworkFee,
    useNetworkFeeReturn.isLoading,
    useNetworkFeeReturn.isSimulateError,
    networkFee,
  ]);

  const isMaxDepositError = useMemo(() => {
    if (!maxDepositAmount || currentBalance === undefined) {
      return false;
    }

    return currentBalance < maxDepositAmount;
  }, [currentBalance, maxDepositAmount]);

  const maxDepositErrorMessage = useMemo(() => {
    if (useNetworkFeeReturn.isLoading) {
      return '';
    }

    if (isMaxDepositError) {
      return 'Insufficient balance';
    }

    return '';
  }, [useNetworkFeeReturn.isLoading, isMaxDepositError]);

  const networkFeeErrorMessage = useMemo(() => {
    if (useNetworkFeeReturn.isSimulateError) {
      if (currentBalance !== 0) {
        return 'This transaction cannot be simulated. Try again.';
      }
    }

    if (isErrorNetworkFee) {
      return 'Insufficient network fee';
    }

    return '';
  }, [useNetworkFeeReturn.isSimulateError, isErrorNetworkFee, currentBalance]);

  const simulateErrorMessage = useMemo(() => {
    if (useNetworkFeeReturn.isSimulateError) {
      return useNetworkFeeReturn.currentGasInfo?.simulateErrorMessage || null;
    }

    return null;
  }, [useNetworkFeeReturn.isSimulateError, useNetworkFeeReturn.currentGasInfo]);

  const onChangeMemo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (hasMemo) {
        return;
      }

      const value = e.target.value;
      changeMemo(value);
    },
    [hasMemo, changeMemo],
  );

  const onClickNetworkFeeSetting = useCallback(() => {
    setOpenedNetworkFeeSetting(true);
  }, []);

  const onClickNetworkFeeClose = useCallback(() => {
    setOpenedNetworkFeeSetting(false);
  }, []);

  const onClickNetworkFeeSave = useCallback(() => {
    useNetworkFeeReturn.save();
    setOpenedNetworkFeeSetting(false);
  }, [useNetworkFeeReturn.save]);

  const onClickConfirmButton = useCallback(() => {
    if (disabledApprove || requiresHoldConfirmation) {
      return;
    }

    onClickConfirm();
  }, [onClickConfirm, disabledApprove, requiresHoldConfirmation]);

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  if (loading) {
    return <ApproveTransactionLoading rightButtonText='Approve' />;
  }

  if (openedNetworkFeeSetting) {
    return (
      <ApproveTransactionNetworkFeeWrapper>
        <NetworkFeeSetting
          {...useNetworkFeeReturn}
          onClickBack={onClickNetworkFeeClose}
          onClickSave={onClickNetworkFeeSave}
        />
      </ApproveTransactionNetworkFeeWrapper>
    );
  }

  return (
    <ApproveTransactionWrapper $isErrorNetworkFee={isErrorNetworkFee || false}>
      <Text className='main-title' type='header4'>
        {title}
      </Text>

      <div className='domain-wrapper'>
        <img className='logo' src={logo || UnknownLogo} alt='logo img' />
        <span>{domain}</span>
      </div>

      <ApproveTransactionMessageBox
        messages={transactionMessages}
        argumentInfos={argumentInfos}
        changeMessages={changeTransactionMessages}
        openScannerLink={openScannerLink}
      />

      <div className={hasMemo ? 'memo-wrapper row' : 'memo-wrapper editable row'}>
        <span className='key'>Memo:</span>
        {hasMemo ? (
          <span className={'value'}>{memo}</span>
        ) : (
          <input
            type='text'
            className={'value'}
            value={memo}
            onChange={onChangeMemo}
            autoComplete='off'
            placeholder='(Optional)'
          />
        )}
      </div>

      <div className='fee-amount-wrapper'>
        <StorageDeposit
          storageDeposit={{
            storageDeposit: useNetworkFeeReturn.currentStorageDeposits?.storageDeposit || 0,
            unlockDeposit: useNetworkFeeReturn.currentStorageDeposits?.unlockDeposit || 0,
          }}
          isLoading={useNetworkFeeReturn.isLoading}
          isError={useNetworkFeeReturn.isSimulateError || isMaxDepositError}
          errorMessage={maxDepositErrorMessage}
        />

        <NetworkFee
          value={networkFee?.amount || ''}
          denom={networkFee?.denom || ''}
          isError={useNetworkFeeReturn.isSimulateError || isErrorNetworkFee}
          isLoading={useNetworkFeeReturn.isLoading}
          errorMessage={networkFeeErrorMessage}
          simulateErrorMessage={simulateErrorMessage}
          onClickSetting={onClickNetworkFeeSetting}
        />
      </div>

      <div className='transaction-data-wrapper'>
        <Button
          hierarchy='custom'
          bgColor='transparent'
          className='visible-button'
          onClick={(): void => onToggleTransactionData(!opened)}
        >
          {opened ? (
            <>
              <>Hide Transaction Data</>
              <img src={IconArraowUp} />
            </>
          ) : (
            <>
              <>View Transaction Data</>
              <img src={IconArraowDown} />
            </>
          )}
        </Button>

        {opened && (
          <div className='textarea-wrapper'>
            <textarea
              className='raw-info-textarea'
              value={transactionData}
              readOnly
              draggable={false}
            />
          </div>
        )}
      </div>

      <BottomFixedLoadingButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={
          requiresHoldConfirmation && onFinishHold
            ? {
                type: 'hold',
                onFinishHold,
              }
            : {
                primary: true,
                disabled: disabledApprove,
                text: 'Approve',
                loading: processing,
                onClick: onClickConfirmButton,
              }
        }
      />
    </ApproveTransactionWrapper>
  );
};
