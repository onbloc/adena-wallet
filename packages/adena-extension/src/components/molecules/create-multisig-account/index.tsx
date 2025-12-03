import React, { useCallback, useEffect, useMemo } from 'react';
import * as S from './create-multisig-account.styles';

import { MultisigConfig, SignerInfo, SignerStatusType } from '@inject/types';

import { Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import { ApproveTransactionLoading } from '../approve-transaction-loading';
import MultisigThreshold from '../multisig-threshold/multisig-threshold';
import DocumentSignerList from '../document-signer-list/document-signer-list';

export interface CreateMultisigAccountProps {
  loading: boolean;
  title: string;
  logo: string;
  domain: string;
  multisigConfig: MultisigConfig | null;
  processing: boolean;
  done: boolean;
  onResponse: () => void;
  onClickConfirm: () => void;
  onClickCancel: () => void;
}

export const CreateMultisigAccount: React.FC<CreateMultisigAccountProps> = ({
  loading,
  title,
  logo,
  domain,
  multisigConfig,
  processing,
  done,
  onResponse,
  onClickConfirm,
  onClickCancel,
}) => {
  const { signerCount, threshold, signerAddresses } = useMemo(() => {
    const signers = multisigConfig?.signers || [];

    return {
      signerCount: signers.length,
      threshold: multisigConfig?.threshold || 0,
      signerAddresses: signers,
    };
  }, [multisigConfig]);

  const signerInfos: SignerInfo[] = useMemo(() => {
    return signerAddresses.map((address) => ({
      address,
      status: SignerStatusType.PENDING,
    }));
  }, [signerAddresses]);

  const disabledApprove = useMemo(() => {
    const insufficientSigners = signerCount < 2;
    const invalidThreshold = threshold < 1 || threshold > signerCount;

    return insufficientSigners || invalidThreshold;
  }, [signerCount, threshold]);

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
    return <ApproveTransactionLoading rightButtonText='Create' />;
  }

  return (
    <S.CreateMultisigAccountWrapper>
      <Text className='main-title' type='header4'>
        {title}
      </Text>

      <S.CreateMultisigAccountDomainWrapper>
        <img className='logo' src={logo || UnknownLogo} alt='logo img' />
        <span>{domain}</span>
      </S.CreateMultisigAccountDomainWrapper>

      <S.CreateMultisigAccountContentWrapper>
        <DocumentSignerList signerInfos={signerInfos} />

        <S.CreateMultisigAccountInfoWrapper>
          <MultisigThreshold threshold={threshold} />
        </S.CreateMultisigAccountInfoWrapper>
      </S.CreateMultisigAccountContentWrapper>

      <BottomFixedLoadingButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          disabled: disabledApprove,
          text: 'Create',
          loading: processing,
          onClick: onClickConfirmButton,
        }}
      />
    </S.CreateMultisigAccountWrapper>
  );
};
