import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAccountInitializeFailed from '@assets/icon-account-initialize-failed';
import IconSubmit from '@assets/submit.svg';
import ExternalLinkIcon from '@assets/web/external-link.svg';
import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButton } from '../bottom-fixed-button';

export interface TransactionResultProps {
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
  onClickViewHistory: () => void;
  onClickViewGnoscan: () => void;
  onClickClose: () => void;
  successIconSrc?: string;
  successButtonText?: string;
  failedButtonText?: string;
}

const TransactionResult: React.FC<TransactionResultProps> = ({
  status,
  errorMessage,
  onClickViewHistory,
  onClickViewGnoscan,
  onClickClose,
  successIconSrc,
  successButtonText = 'View history',
  failedButtonText = 'Close',
}) => {
  const theme = useTheme();
  const isSuccess = status === 'SUCCESS';

  const failureErrorMessage = useMemo(() => {
    if (!errorMessage) {
      return 'Unknown error';
    }

    return errorMessage;
  }, [errorMessage]);

  return (
    <CommonFullContentLayout>
      <StyledResultWrapper>
        {isSuccess ? (
          <img src={successIconSrc || IconSubmit} alt='result icon' />
        ) : (
          <IconAccountInitializeFailed />
        )}
        <StyledDescriptionWrapper>
          <Text type='header4' textAlign='center'>
            {isSuccess ? 'Transaction Submitted' : 'Transaction Failed'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {isSuccess
              ? 'Your transaction has been successfully\nsubmitted to the blockchain.'
              : 'Your transaction could not be submitted to the blockchain. Try again.'}
          </Text>
        </StyledDescriptionWrapper>
        {!isSuccess && (
          <StyledErrorWrapper>
            <Text type='captionReg'>
              <StyledErrorTitle>ERROR:</StyledErrorTitle> {failureErrorMessage}
            </Text>
          </StyledErrorWrapper>
        )}
        {isSuccess && (
          <StyledScannerButton onClick={onClickViewGnoscan}>
            <span className='scanner-label'>View on GnoScan</span>
            <img className='scanner-icon' src={ExternalLinkIcon} alt='open gnoscan' />
          </StyledScannerButton>
        )}
      </StyledResultWrapper>
      <BottomFixedButton
        text={isSuccess ? successButtonText : failedButtonText}
        onClick={isSuccess ? onClickViewHistory : onClickClose}
      />
    </CommonFullContentLayout>
  );
};

export default TransactionResult;

const StyledResultWrapper = styled(View)`
  margin-top: 56px;
  gap: 23px;
  justify-content: center;
  align-items: center;
`;

const StyledDescriptionWrapper = styled(View)`
  gap: 12px;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
`;

const StyledErrorWrapper = styled(View)`
  width: 320px;
  min-height: 40px;
  border-radius: 20px;
  background: rgba(231, 50, 59, 0.15);
  padding: 10px 20px;
  display: flex;
  align-items: center;
`;

const StyledErrorTitle = styled.span`
  color: #e7323b;
  font-weight: 700;
`;

const StyledScannerButton = styled.button`
  margin-top: 12px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  text-decoration: underline;
  color: ${({ theme }): string => theme.neutral.a};
  transition: color 0.2s ease;

  .scanner-label {
    font-size: 16px;
    line-height: 24px;
  }

  .scanner-icon {
    width: 17px;
    height: 17px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  &:hover {
    color: ${({ theme }): string => theme.red._5};
  }

  &:hover .scanner-icon {
    opacity: 1;
  }
`;
