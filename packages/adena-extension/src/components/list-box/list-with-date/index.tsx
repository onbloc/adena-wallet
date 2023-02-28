import React from 'react';
import styled from 'styled-components';
import Text from '../../text';
import theme from '@styles/theme';
import { dateTimeFormatEn, getDateDiff } from '@common/utils/client-utils';
import ListBox from '../index';
import success from '../../../assets/success.svg';
import failed from '../../../assets/failed.svg';
import { HistoryItemType } from 'gno-client/src/api/response';
import { useTransactionHistoryInfo } from '@hooks/use-transaction-history-info';

interface HistoryItemProps {
  onClick: (item: any) => void;
  date: string;
  transaction: Array<HistoryItemType>;
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
  const [{ getTransactionInfo, getStatusColor }] = useTransactionHistoryInfo();

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
  };

  const renderTransactionItem = (item: HistoryItemType, idx: number) => {
    const info = getTransactionInfo(item);

    return (
      <ListBox
        left={
          <SymbolImage status={item.result.status === 'Success'} className='logo'>
            <img src={info.icon} alt='_' />
          </SymbolImage>
        }
        center={
          <Center>
            <Text display={'flex'} type='body3Bold'>
              {info.title}
              {info.msgNum > 1 && <Text type='body4Bold'>{`  +${info.msgNum - 1}`}</Text>}
            </Text>
            <Text type='body3Reg' color={theme.color.neutral[9]}>
              {info.titleDescription}
            </Text>
          </Center>
        }
        right={
          <Text type='body3Reg' color={getStatusColor(item)}>
            {info.amount}
          </Text>
        }
        hoverAction={true}
        key={idx}
        onClick={() => props.onClick(item)}
      />
    );
  };

  return (
    <Wrapper>
      <Text className='p-date' type='body1Reg' color={theme.color.neutral[9]}>
        {getDateText()}
      </Text>
      {props.transaction.map(renderTransactionItem)}
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
  margin-right: auto;
  & > div {
    align-items: center;
  }
`;

export default ListWithDate;
