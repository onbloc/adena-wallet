import React, { useCallback, useEffect, useMemo } from 'react';

import { Account, isMultisigAccount, MultisigConfig, SignerPublicKeyInfo } from 'adena-module';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage, Signature, SignerInfo } from '@inject/types';
import { NetworkFee as NetworkFeeType } from '@types';
import { createMultisigSignerInfoList, filterValidSignatures } from '@common/utils/multisig-utils';

import { Button, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';

import {
  ApproveTransactionWrapper,
  ApproveTransactionNetworkFeeWrapper,
} from '../approve-transaction/approve-transaction.styles';
import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import ApproveTransactionMessageBox from '../approve-transaction-message-box/approve-transaction-message-box';
import NetworkFee from '../network-fee/network-fee';
import DocumentSignerListScreen from '@components/pages/document-signer-list-screen/document-signer-list-screen';
import MultisigBroadcastThreshold from '../multisig-threshold/multisig-broadcast-threshold';
import DocumentBroadcastSigner from '../document-signer/document-broadcast-signer';

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
  isNetworkFeeLoading?: boolean;
  networkFee: NetworkFeeType;
  transactionData: string;
  opened: boolean;
  argumentInfos?: GnoArgumentInfo[];
  processing: boolean;
  done: boolean;
  transactionMessages: ContractMessage[];
  multisigConfig: MultisigConfig | null;
  signatures: Signature[];
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
  hasMemo,
  networkFee,
  isErrorNetworkFee,
  isNetworkFeeLoading,
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
  const [openedSigners, setOpenedSigners] = React.useState(false);

  const signerPublicKeys: SignerPublicKeyInfo[] = useMemo(() => {
    if (!currentAccount) {
      return [];
    }

    return isMultisigAccount(currentAccount) ? currentAccount.signerPublicKeys : [];
  }, [currentAccount]);

  const validSignatures: Signature[] = useMemo(() => {
    return filterValidSignatures(signatures, signerPublicKeys);
  }, [signatures, signerPublicKeys]);

  const signerInfos: SignerInfo[] = useMemo(() => {
    return createMultisigSignerInfoList(signerPublicKeys, validSignatures);
  }, [signerPublicKeys, validSignatures]);

  const signerCount = signerPublicKeys.length;
  const signedCount = validSignatures.length;

  const threshold = useMemo(() => {
    return multisigConfig?.threshold ?? 0;
  }, [multisigConfig]);

  const disabledBroadcast = useMemo(() => {
    if (isErrorNetworkFee || isNetworkFeeLoading) {
      return true;
    }

    if (!multisigConfig) {
      return true;
    }

    if (validSignatures.length < threshold) {
      return true;
    }

    return Number(networkFee?.amount || 0) <= 0;
  }, [
    isErrorNetworkFee,
    isNetworkFeeLoading,
    networkFee,
    multisigConfig,
    validSignatures,
    threshold,
  ]);

  const networkFeeErrorMessage = useMemo(() => {
    if (isErrorNetworkFee) {
      return 'Insufficient network fee';
    }

    return '';
  }, [isErrorNetworkFee]);

  const onClickConfirmButton = useCallback(() => {
    if (disabledBroadcast) {
      return;
    }

    onClickConfirm();
  }, [onClickConfirm, disabledBroadcast]);

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
    return <ApproveTransactionLoading rightButtonText='Broadcast' />;
  }

  if (openedSigners) {
    return (
      <ApproveTransactionNetworkFeeWrapper>
        <DocumentSignerListScreen signerInfos={signerInfos} onClickBack={onClickSignersBack} />
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
        <MultisigBroadcastThreshold signedCount={signedCount} threshold={threshold} />
      </div>

      <div className='fee-amount-wrapper'>
        <DocumentBroadcastSigner
          signedCount={signedCount}
          signerCount={signerCount}
          onClickSetting={onClickSignersSetting}
        />
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
          isLoading={isNetworkFeeLoading}
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
              <img src={IconArraowUp} alt='collapse' />
            </>
          ) : (
            <>
              <>View Transaction Data</>
              <img src={IconArraowDown} alt='expand' />
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
