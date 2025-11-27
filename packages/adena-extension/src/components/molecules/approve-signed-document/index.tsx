import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
import DocumentSigner from '../document-signer/document-signer';
import NetworkFee from '../network-fee/network-fee';
import {
  ApproveSignedDocumentSignerWrapper,
  ApproveSignedDocumentWrapper,
} from './approve-signed-document.styles';
import { Signature } from '@adena-wallet/sdk';
import DocumentSignerListScreen from '@components/pages/document-signer-list-screen/document-signer-list-screen';
import { useSignerAddresses } from '@hooks/wallet/use-signer-addresses';

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
  signatures: Signature[];
  hasSignatures: boolean;
  memo: string;
  hasMemo: boolean;
  currentBalance?: number;
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
  changeTransactionMessages: (messages: ContractMessage[]) => void;
  changeMemo: (memo: string) => void;
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
  signatures,
  hasSignatures,
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
  changeTransactionMessages,
  changeMemo,
  onToggleTransactionData,
  onResponse,
  onClickConfirm,
  onClickCancel,
  openScannerLink,
}) => {
  const [openedSigners, setOpenedSigners] = useState(false);

  const { signerAddresses } = useSignerAddresses(signatures);

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

  const onClickConfirmButton = useCallback(() => {
    if (disabledApprove) {
      return;
    }

    onClickConfirm();
  }, [onClickConfirm, disabledApprove]);

  const onClickSignersSetting = useCallback(() => {
    setOpenedSigners(true);
  }, []);

  const onClickSignersBack = useCallback(() => {
    setOpenedSigners(false);
  }, []);

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  if (loading) {
    return <ApproveTransactionLoading rightButtonText='Approve' />;
  }

  if (openedSigners) {
    return (
      <ApproveSignedDocumentSignerWrapper>
        <DocumentSignerListScreen
          signerAddresses={signerAddresses}
          onClickBack={onClickSignersBack}
        />
      </ApproveSignedDocumentSignerWrapper>
    );
  }

  return (
    <ApproveSignedDocumentWrapper isErrorNetworkFee={isErrorNetworkFee || false}>
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

      {hasSignatures && (
        <div className='fee-amount-wrapper'>
          <DocumentSigner
            signerCount={signerAddresses.length}
            onClickSetting={onClickSignersSetting}
          />
        </div>
      )}

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
