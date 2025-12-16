import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MultisigConfig } from 'adena-module';

import { Button, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';

import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage, SignerInfo, SignerStatusType } from '@inject/types';
import { NetworkFee as NetworkFeeType } from '@types';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import ApproveTransactionMessageBox from '../approve-transaction-message-box/approve-transaction-message-box';
import DocumentSigner from '../document-signer/document-signer';
import NetworkFee from '../network-fee/network-fee';
import {
  CreateMultisigTransactionSignerWrapper,
  CreateMultisigTransactionWrapper,
} from './create-multisig-transaction.styles';
import DocumentSignerListScreen from '@components/pages/document-signer-list-screen/document-signer-list-screen';
import MultisigThreshold from '../multisig-threshold/multisig-threshold';
import { useSignerAddresses } from '@hooks/wallet/use-signer-addresses';
import { EncodeTxSignature } from '@services/index';

export interface CreateMultisigTransactionProps {
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
  multisigConfig: MultisigConfig | null;
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

export const CreateMultisigTransaction: React.FC<CreateMultisigTransactionProps> = ({
  loading,
  title,
  logo,
  domain,
  signatures,
  transactionMessages,
  memo,
  hasMemo,
  networkFee,
  multisigConfig,
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

  const { signerAddresses: signedAddressesFromPubKey } = useSignerAddresses(signatures);

  const { signedAddressSet } = useMemo(() => {
    const signers = multisigConfig?.signers || [];
    const signerSet = new Set(signers);

    const validSigned = signedAddressesFromPubKey.filter((address) => signerSet.has(address));

    const signedSet = new Set(validSigned);

    return {
      signedAddressSet: signedSet,
    };
  }, [multisigConfig, signedAddressesFromPubKey]);

  const { signedCount, signerCount, threshold, signerAddresses } = useMemo(() => {
    const signers = multisigConfig?.signers || [];

    return {
      signedCount: signedAddressSet.size,
      signerCount: signers.length,
      threshold: multisigConfig?.threshold || 0,
      signerAddresses: signers,
    };
  }, [multisigConfig, signedAddressSet]);

  const signerInfos: SignerInfo[] = useMemo(() => {
    return signerAddresses.map((address) => ({
      address,
      status: SignerStatusType.NONE,
    }));
  }, [signedAddressSet, signerAddresses]);

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
      <CreateMultisigTransactionSignerWrapper>
        <DocumentSignerListScreen signerInfos={signerInfos} onClickBack={onClickSignersBack} />
      </CreateMultisigTransactionSignerWrapper>
    );
  }

  return (
    <CreateMultisigTransactionWrapper isErrorNetworkFee={isErrorNetworkFee || false}>
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
        editable={false}
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
        <DocumentSigner
          signedCount={signedCount}
          signerCount={signerCount}
          onClickSetting={onClickSignersSetting}
        />
      </div>

      <div className='fee-amount-wrapper'>
        <MultisigThreshold threshold={threshold} />
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
    </CreateMultisigTransactionWrapper>
  );
};
