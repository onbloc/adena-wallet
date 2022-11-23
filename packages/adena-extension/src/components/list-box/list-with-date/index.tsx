import React from 'react';
import styled from 'styled-components';
import Text from '../../text';
import theme from '@styles/theme';
import { dateTimeFormatEn, getDateDiff } from '@common/utils/client-utils';
import ListBox from '../index';
import success from '../../../assets/success.svg';
import failed from '../../../assets/failed.svg';
import { HistoryItem } from 'gno-client/src/api/response';
import { useTransactionHistoryInfo } from '@hooks/use-transaction-history-info';

interface HistoryItemProps {
  onClick: (item: any) => void;
  date: string;
  transaction: Array<HistoryItem>;
}

const SymbolImage = styled.div<{ status: boolean }>`
  position: relative;
  width: 34px;
  height: 34px;
  &::after {
    content: '';
    display: block;
    width: 12px;
    height: 12px;
    background: url(${({ status }) => (status ? success : failed)}) no-repeat;
    position: absolute;
    bottom: 0px;
    right: 0px;
  }
`;

export const ListWithDate = (props: HistoryItemProps) => {

  const [{
    getIcon,
    getStatusColor,
    getFunctionName,
    getDescription,
    getAmountValue,
  }] = useTransactionHistoryInfo();

  const getDateText = () => {
    const currentDate = new Date(props.date);
    const dateDiff = getDateDiff(currentDate);
    let formatDate = '';

    if (dateDiff === 0) {
      formatDate = 'Today';
    } else if (dateDiff === 1) {
      formatDate = 'Yesterday';
    } else {
      const result = dateTimeFormatEn(currentDate);
      formatDate = `${result.month} ${result.day}, ${result.year}`;
    }
    return formatDate;
  }

  return (
    <Wrapper>
      <Text className='p-date' type='body1Reg' color={theme.color.neutral[9]}>
        {getDateText()}
      </Text>
      {props.transaction.map((item: HistoryItem, idx: number) => (
        <ListBox
          left={
            <SymbolImage status={item.result.status === 'Success'}>
              <img src={getIcon(item)} alt='_' />
            </SymbolImage>
          }
          center={
            <Center>
              <Text type='body3Bold'>
                {getFunctionName(item)}
              </Text>
              <Text type='body3Reg' color={theme.color.neutral[9]}>
                {getDescription(item)}
              </Text>
            </Center>
          }
          right={
            <Text
              type='body3Reg'
              color={getStatusColor(item)}
            >{getAmountValue(item)}</Text>
          }
          hoverAction={true}
          gap={12}
          key={idx}
          onClick={() => props.onClick(item)}
        />
      ))}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  width: 100%;
  & + & {
    margin-top: 24px;
  }
  .p-date {
    margin-bottom: 12px;
  }
`;

const Center = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
`;

export default ListWithDate;