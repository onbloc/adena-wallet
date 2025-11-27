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
import { Signature } from '@adena-wallet/sdk';
import { publicKeyToAddress } from 'adena-module';

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
  const [signerAddresses, setSignerAddresses] = React.useState<string[]>([]);

  useEffect(() => {
    const extractAddresses = async () => {
      if (!signatures || signatures.length === 0) {
        setSignerAddresses([]);

        return;
      }

      try {
        const addresses = await Promise.all(
          signatures.map(async (signature) => {
            if (!signature?.pubKey?.value) {
              return '';
            }

            try {
              const fullBytes = Uint8Array.from(atob(signature.pubKey.value), (c) =>
                c.charCodeAt(0),
              );

              const pubKeyBytes = fullBytes.slice(2);

              const address = await publicKeyToAddress(pubKeyBytes);
              return address;
            } catch (e) {
              console.error('Failed to extract address from signature:', e);
              return '';
            }
          }),
        );

        setSignerAddresses(addresses.filter((addr) => addr !== ''));
      } catch (e) {
        console.error('Failed to extract signer addresses:', e);
        setSignerAddresses([]);
      }
    };

    extractAddresses();
  }, [signatures]);

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

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  if (loading) {
    return <ApproveTransactionLoading rightButtonText='Approve' />;
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

      {/* Signer Addresses Section */}
      {hasSignatures && (
        <div className='signer-addresses-wrapper row'>
          <span className='key'>Signers:</span>
          <div className='addresses-list'>
            {signerAddresses.map((address, index) => (
              <span key={index} className='address-item'>
                {address}
              </span>
            ))}
          </div>
        </div>
      )}

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
