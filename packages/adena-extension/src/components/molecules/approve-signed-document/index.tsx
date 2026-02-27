import React, { useCallback, useEffect, useMemo } from 'react';

import { Button, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';

import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { NetworkFee as NetworkFeeType } from '@types';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import ApproveTransactionMessageBox from '../approve-transaction-message-box/approve-transaction-message-box';
import NetworkFee from '../network-fee/network-fee';
import { ApproveSignedDocumentWrapper } from './approve-signed-document.styles';
import { EncodeTxSignature } from '@services/index';

export interface ApproveSignedDocumentProps {
  loading: boolean;
  title: string;
  logo: string;
  domain: string;
  contracts: {
    type: string;
    function: string;
    value: string;
  }[];
  signatures: EncodeTxSignature[];
  memo: string;
  hasMemo: boolean;
  isErrorNetworkFee?: boolean;
  isNetworkFeeLoading: boolean;
  networkFee: NetworkFeeType | null;
  transactionData: string;
  opened: boolean;
  argumentInfos?: GnoArgumentInfo[];
  processing: boolean;
  done: boolean;
  transactionMessages: ContractMessage[];
  maxDepositAmount?: number;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  onToggleTransactionData: (opened: boolean) => void;
  onResponse: () => void;
  onTimeout: () => void;
  onClickConfirm: () => void;
  onClickCancel: () => void;
}

export const ApproveSignedDocument: React.FC<ApproveSignedDocumentProps> = ({
  loading,
  title,
  logo,
  domain,
  transactionMessages,
  memo,
  hasMemo,
  networkFee,
  isErrorNetworkFee,
  isNetworkFeeLoading,
  transactionData,
  opened,
  processing,
  done,
  argumentInfos,
  onToggleTransactionData,
  onResponse,
  onClickConfirm,
  onClickCancel,
  openScannerLink,
}) => {
  const disabledApprove = useMemo(() => {
    if (isNetworkFeeLoading) {
      return true;
    }

    if (isErrorNetworkFee) {
      return true;
    }

    return Number(networkFee?.amount || 0) <= 0;
  }, [isErrorNetworkFee, isNetworkFeeLoading, networkFee]);

  const networkFeeErrorMessage = useMemo(() => {
    if (isErrorNetworkFee) {
      return 'Insufficient network fee';
    }

    return '';
  }, [isErrorNetworkFee]);

  const onClickConfirmButton = useCallback(() => {
    if (disabledApprove) {
      return;
    }

    onClickConfirm();
  }, [onClickConfirm, disabledApprove]);

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  if (loading) {
    return <ApproveTransactionLoading rightButtonText='Approve' />;
  }

  return (
    <ApproveSignedDocumentWrapper $isErrorNetworkFee={isErrorNetworkFee || false}>
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
        openScannerLink={openScannerLink}
        editable={false}
      />

      <div className={hasMemo ? 'memo-wrapper row' : 'memo-wrapper editable row'}>
        <span className='key'>Memo:</span>
        {hasMemo ? <span className={'value'}>{memo}</span> : null}
      </div>

      <div className='fee-amount-wrapper'>
        <NetworkFee
          value={networkFee?.amount || ''}
          denom={networkFee?.denom || ''}
          isError={isErrorNetworkFee}
          isLoading={isNetworkFeeLoading}
          errorMessage={networkFeeErrorMessage}
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
        rightButton={{
          primary: true,
          disabled: disabledApprove,
          text: 'Approve',
          loading: processing,
          onClick: onClickConfirmButton,
        }}
      />
    </ApproveSignedDocumentWrapper>
  );
};
