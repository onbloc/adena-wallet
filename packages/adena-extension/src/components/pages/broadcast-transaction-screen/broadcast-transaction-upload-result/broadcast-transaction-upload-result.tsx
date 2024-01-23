import React, { useCallback, useState } from 'react';

import { TransactionDisplayInfo } from '@hooks/wallet/broadcast-transaction/use-broadcast-transaction-screen';
import { CopyIconButton, Text } from '@components/atoms';
import { formatAddress } from '@common/utils/client-utils';
import { StyledInfoButton, StyledInfoWrapper, StyledResultColumnName, StyledResultColumnValue, StyledResultRow, StyledTableWrapper, StyledTransactionArea, StyledTransactionAreaWrapper, StyledWrapper } from './broadcast-transaction-upload-result.styles';
import { useTheme } from 'styled-components';
import IconArrowDown from '@assets/arrowS-down-gray.svg';
import IconArrowUp from '@assets/arrowS-up-gray.svg';

export interface BroadcastTransactionUploadResultProps {
  transactionInfos: TransactionDisplayInfo[];
  rawTransaction: string;
}

const BroadcastTransactionUploadResult: React.FC<BroadcastTransactionUploadResultProps> = ({
  transactionInfos,
  rawTransaction,
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
        {transactionInfos.map((transactionInfo, index) => (
          <StyledResultRow key={index}>
            <StyledResultColumnName>
              {transactionInfo.name}
            </StyledResultColumnName>

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
            <StyledTransactionArea
              value={rawTransaction}
              readOnly
              draggable={false}
            />
          </StyledTransactionAreaWrapper>
        )}
      </StyledInfoWrapper>
    </StyledWrapper>
  );
};

export default BroadcastTransactionUploadResult;