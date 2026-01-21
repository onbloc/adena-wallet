import React, { useCallback, useState } from 'react';

import IconArrowDown from '@assets/arrowS-down-gray.svg';
import IconArrowUp from '@assets/arrowS-up-gray.svg';
import { formatAddress } from '@common/utils/client-utils';
import { CopyIconButton, Text } from '@components/atoms';
import ArgumentEditBox from '@components/molecules/argument-edit-box/argument-edit-box';
import { TransactionDisplayInfo } from '@hooks/wallet/broadcast-transaction/use-broadcast-transaction-screen';
import { useTheme } from 'styled-components';
import {
  StyledInfoButton,
  StyledInfoWrapper,
  StyledResultColumnName,
  StyledResultColumnValue,
  StyledResultRow,
  StyledTableWrapper,
  StyledTransactionArea,
  StyledTransactionAreaWrapper,
  StyledWrapper,
} from './broadcast-transaction-upload-result.styles';

export interface BroadcastTransactionUploadResultProps {
  transactionInfos: TransactionDisplayInfo[];
  rawTransaction: string;
  signInfo?: {
    accountNumber: string;
    sequence: string;
    chainId: string;
    setAccountNumber: (accountNumber: string) => void;
    setSequence: (sequence: string) => void;
  };
}

const BroadcastTransactionUploadResult: React.FC<BroadcastTransactionUploadResultProps> = ({
  transactionInfos,
  rawTransaction,
  signInfo,
}) => {
  const theme = useTheme();
  const [visibleInfo, setVisibleInfo] = useState(false);

  const toggleVisibleInfo = useCallback(() => {
    setVisibleInfo(!visibleInfo);
  }, [visibleInfo]);

  const getExtraInfo = useCallback((extra: string) => {
    return `+${extra}`;
  }, []);

  const getValue = useCallback((transactionInfo: TransactionDisplayInfo) => {
    if (transactionInfo.type === 'ADDRESS') {
      return formatAddress(transactionInfo.value, 4);
    }
    return transactionInfo.value;
  }, []);

  return (
    <StyledWrapper>
      <StyledTableWrapper>
        {signInfo && (
          <React.Fragment>
            <StyledResultRow>
              <StyledResultColumnName>Account Number</StyledResultColumnName>
              <ArgumentEditBox
                value={signInfo.accountNumber}
                onChange={(value): void => signInfo.setAccountNumber(value)}
              />
            </StyledResultRow>
            <StyledResultRow>
              <StyledResultColumnName>Sequence</StyledResultColumnName>
              <ArgumentEditBox
                value={signInfo.sequence}
                onChange={(value): void => signInfo.setSequence(value)}
              />
            </StyledResultRow>
            <StyledResultRow>
              <StyledResultColumnName>Chain ID</StyledResultColumnName>
              <StyledResultColumnValue>{signInfo.chainId}</StyledResultColumnValue>
            </StyledResultRow>
          </React.Fragment>
        )}
        {transactionInfos.map((transactionInfo, index) => (
          <StyledResultRow key={index}>
            <StyledResultColumnName>{transactionInfo.name}</StyledResultColumnName>

            <StyledResultColumnValue>
              {getValue(transactionInfo)}
              {transactionInfo.extra && (
                <Text type='body3Reg'>{getExtraInfo(transactionInfo.extra)}</Text>
              )}
              {transactionInfo.type === 'ADDRESS' && (
                <CopyIconButton copyText={transactionInfo.value} />
              )}
            </StyledResultColumnValue>
          </StyledResultRow>
        ))}
      </StyledTableWrapper>

      <StyledInfoWrapper>
        <StyledInfoButton onClick={toggleVisibleInfo}>
          <Text type='body1Reg' color={theme.neutral.a}>
            {visibleInfo ? 'Hide Transaction Data' : 'View Transaction Data'}
          </Text>
          {visibleInfo ? <img src={IconArrowUp} /> : <img src={IconArrowDown} />}
        </StyledInfoButton>

        {visibleInfo && (
          <StyledTransactionAreaWrapper>
            <StyledTransactionArea value={rawTransaction} readOnly draggable={false} />
          </StyledTransactionAreaWrapper>
        )}
      </StyledInfoWrapper>
    </StyledWrapper>
  );
};

export default BroadcastTransactionUploadResult;
