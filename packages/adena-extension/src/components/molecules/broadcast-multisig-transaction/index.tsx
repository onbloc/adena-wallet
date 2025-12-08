import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';

import { MultisigConfig } from 'adena-module';
import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { NetworkFee as NetworkFeeType } from '@types';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import ApproveTransactionMessageBox from '../approve-transaction-message-box/approve-transaction-message-box';
import NetworkFee from '../network-fee/network-fee';
import { ApproveTransactionWrapper } from '../approve-transaction/approve-transaction.styles';

export interface BroadcastMultisigTransactionProps {
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
  networkFee: NetworkFeeType;
  transactionData: string;
  opened: boolean;
  argumentInfos?: GnoArgumentInfo[];
  processing: boolean;
  done: boolean;
  transactionMessages: ContractMessage[];
  multisigConfig: MultisigConfig | null;
  signatures: any[];
  changeMemo: (memo: string) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  onToggleTransactionData: (opened: boolean) => void;
  onResponse: () => void;
  onTimeout: () => void;
  onClickConfirm: () => void;
  onClickCancel: () => void;
}

export const BroadcastMultisigTransaction: React.FC<BroadcastMultisigTransactionProps> = ({
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
  argumentInfos,
  multisigConfig,
  signatures,
  changeMemo,
  onToggleTransactionData,
  onResponse,
  onClickConfirm,
  onClickCancel,
  openScannerLink,
}) => {
  const disabledBroadcast = useMemo(() => {
    if (isErrorNetworkFee) {
      return true;
    }

    if (!multisigConfig) {
      return true;
    }

    // Check if we have enough signatures
    if (signatures.length < multisigConfig.threshold) {
      return true;
    }

    return Number(networkFee?.amount || 0) <= 0;
  }, [isErrorNetworkFee, networkFee, multisigConfig, signatures]);

  const networkFeeErrorMessage = useMemo(() => {
    if (isErrorNetworkFee) {
      return 'Insufficient network fee';
    }

    return '';
  }, [isErrorNetworkFee, currentBalance]);

  const signatureStatusMessage = useMemo(() => {
    if (!multisigConfig) {
      return '';
    }

    const collected = signatures.length;
    const required = multisigConfig.threshold;

    if (collected < required) {
      return `Need ${required - collected} more signature(s)`;
    }

    return `Ready to broadcast (${collected}/${required})`;
  }, [multisigConfig, signatures]);

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
    if (disabledBroadcast) {
      return;
    }

    onClickConfirm();
  }, [onClickConfirm, disabledBroadcast]);

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  if (loading) {
    return <ApproveTransactionLoading rightButtonText='Broadcast' />;
  }

  return (
    <ApproveTransactionWrapper isErrorNetworkFee={isErrorNetworkFee || false}>
      <Text className='main-title' type='header4'>
        {title}
      </Text>

      <div className='domain-wrapper'>
        <img className='logo' src={logo || UnknownLogo} alt='logo img' />
        <span>{domain}</span>
      </div>

      {/* Multisig Info */}
      {multisigConfig && (
        <div className='memo-wrapper row'>
          <span className='key'>Multisig:</span>
          <span className='value'>
            {multisigConfig.threshold} of {multisigConfig.signers.length}
          </span>
        </div>
      )}

      {/* Signature Status */}
      <div className='memo-wrapper row'>
        <span className='key'>Signatures:</span>
        <span
          className='value'
          style={{
            color: signatures.length >= (multisigConfig?.threshold || 0) ? '#00D26B' : '#FF6B6B',
          }}
        >
          {signatureStatusMessage}
        </span>
      </div>

      <ApproveTransactionMessageBox
        messages={transactionMessages}
        argumentInfos={argumentInfos}
        changeMessages={() => {}} // Read-only for broadcast
        openScannerLink={openScannerLink}
      />

      <div className='memo-wrapper row'>
        <span className='key'>Memo:</span>
        <span className='value'>{memo || '(None)'}</span>
      </div>

      <div className='fee-amount-wrapper'>
        <NetworkFee
          value={networkFee?.amount || ''}
          denom={networkFee?.denom || ''}
          isError={isErrorNetworkFee}
          isLoading={false}
          errorMessage={networkFeeErrorMessage}
          simulateErrorMessage={null}
          onClickSetting={() => {}} // No setting for broadcast
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
          disabled: disabledBroadcast,
          text: 'Broadcast',
          loading: processing,
          onClick: onClickConfirmButton,
        }}
      />
    </ApproveTransactionWrapper>
  );
};
