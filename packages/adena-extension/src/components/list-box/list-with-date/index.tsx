import React from 'react';
import styled from 'styled-components';
import Text from '../../text';
import theme from '@styles/theme';
import { amountSetSymbol, funcTextFilter } from '@common/utils/client-utils';
import ListBox from '../index';
import success from '../../../assets/success.svg';
import failed from '../../../assets/failed.svg';

interface HistoryItemProps {
  onClick: (item: any) => void;
  date: string;
  transaction: any[];
}

const SymbolWithStatus = ({ item }: any) => {
  return (
    <SymbolImage status={item.txStatus === 'Success'}>
      <img src={item.txImg} alt='txImg' />
    </SymbolImage>
  );
};

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

export const ListWithDate = (p: HistoryItemProps) => {
  return (
    <Wrapper>
      <Text className='p-date' type='body1Reg' color={theme.color.neutral[9]}>
        {p.date}
      </Text>
      {p.transaction.map((item: any, idx: number) => (
        <ListBox
          left={<SymbolWithStatus item={item} />}
          center={
            <Center>
              <Text type='body3Bold'>
                {item.txType === '/bank.MsgSend' ? funcTextFilter(item.txFunc) : item.txFunc}
              </Text>
              <Text type='body3Reg' color={theme.color.neutral[9]}>
                {item.txDesc}
              </Text>
            </Center>
          }
          right={
            <Text
              type='body3Reg'
              color={txStatusColor(item.txStatus, item.txFunc)}
            >{`${amountSetSymbol(item.txSend)} GNOT`}</Text>
          }
          hoverAction={true}
          gap={12}
          key={idx}
          onClick={() => p.onClick(item)}
        />
      ))}
    </Wrapper>
  );
};

const txStatusColor = (txStatus: string, txFunc: string) => {
  if (txFunc === 'Received' && txStatus === 'Success') {
    return theme.color.green[2];
  } else if (txStatus === 'Success') {
    return theme.color.neutral[0];
  } else if (txStatus === 'Failed') {
    return theme.color.neutral[9];
  }
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
