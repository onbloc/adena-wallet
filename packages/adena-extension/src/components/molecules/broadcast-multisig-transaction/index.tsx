import React, { useCallback, useEffect, useMemo } from 'react';
import { useTheme } from 'styled-components';

import { Button, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';
import { Account, isMultisigAccount, MultisigConfig } from 'adena-module';

import {
  ApproveTransactionWrapper,
  ApproveTransactionNetworkFeeWrapper,
} from '../approve-transaction/approve-transaction.styles';
import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import { NetworkFee as NetworkFeeType } from '@types';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import ApproveTransactionMessageBox from '../approve-transaction-message-box/approve-transaction-message-box';
import NetworkFee from '../network-fee/network-fee';
import DocumentSigner from '../document-signer/document-signer';
import DocumentSignerListScreen from '@components/pages/document-signer-list-screen/document-signer-list-screen';
import MultisigThreshold from '../multisig-threshold/multisig-threshold';

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
  currentAccount: Account | null;
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
  currentAccount,
  onToggleTransactionData,
  onResponse,
  onClickConfirm,
  onClickCancel,
  openScannerLink,
}) => {
  const theme = useTheme();

  const [openedSigners, setOpenedSigners] = React.useState(false);
  const onClickSignersSetting = useCallback(() => {
    setOpenedSigners(true);
  }, []);
  const onClickSignersBack = useCallback(() => {
    setOpenedSigners(false);
  }, []);

  const signerPublicKeys = useMemo(() => {
    if (!currentAccount) {
      return null;
    }

    return isMultisigAccount(currentAccount) ? currentAccount.signerPublicKeys : null;
  }, [currentAccount]);

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

  if (openedSigners) {
    return (
      <ApproveTransactionNetworkFeeWrapper>
        <DocumentSignerListScreen signerInfos={[]} onClickBack={onClickSignersBack} />
      </ApproveTransactionNetworkFeeWrapper>
    );
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

      <div className='fee-amount-wrapper'>
        <MultisigThreshold threshold={3} />
      </div>

      {/* <div className='fee-amount-wrapper'>
        <DocumentSigner signedCount={3} signerCount={3} onClickSetting={onClickSignersSetting} />
      </div> */}

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
            color:
              signatures.length >= (multisigConfig?.threshold || 0) ? theme.green._5 : theme.red._5,
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
        editable={false}
      />

      <div className='memo-wrapper row'>
        <span className='key'>Memo:</span>
        {hasMemo ? <span className='value'>{memo}</span> : null}
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
