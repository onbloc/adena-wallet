import React from 'react';
import styled from 'styled-components';
import Typography from '../Typography';
import theme from '@styles/theme';

interface Transaction {
  type: string;
  nftImg: string;
  nftType: string;
  account: string;
  amount: string;
  receiver: string;
}

interface HistoryItemProps {
  onClick: (item: any) => void;
  date: string;
  //transaction: Transaction[];
  transaction: any[];
}

const Wrapper = styled.div`
  width: 100%;
  & + & {
    margin-top: 24px;
  }
`;

const BoxWrap = styled.ul`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  gap: 12px;
  margin-top: 12px;
`;

const ListItem = styled.li`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 60px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  transition: all 0.4s ease;
  :hover {
    background-color: rgba(0, 89, 255, 0.04);
  }
  border-radius: 18px;
  padding: 0px 17px 0px 17px;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  cursor: pointer;
`;

const Center = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
  margin-left: 12px;
  flex: 1;
`;

const getColorByAmount = (amount: string) => {
  return amount.includes('-') ? '#C1C4CD' : '#74CEB9';
};

const getTransactionType = (amount: string, type: string) => {
  if (type !== 'valid_tx') return 'Error';
  return amount.includes('-') ? 'Sent' : 'Received';
};

const getTransactionSign = (amount: string) => {
  return amount.includes('-') ? 'To' : 'From';
};

const getFromToAddr = (fromto: string, from: string, to: string) => {
  return fromto === 'To'
    ? to.slice(0, 4) + '..' + to.slice(-4)
    : from.slice(0, 4) + '..' + from.slice(-4);
};

// amount text는 type에 따라서 color 다르게 보여줘야함.
export const HistoryItem = (p: HistoryItemProps) => {
  return (
    <Wrapper>
      <Typography type='body1Reg' color={theme.color.neutral[1]}>
        {p.date}
      </Typography>
      <BoxWrap>
        {p.transaction.map((item: any, idx: number) => (
          <ListItem key={idx} onClick={() => p.onClick(item)}>
            <img src={item.nftImg} alt='ntf logo' />
            <Center>
              {getTransactionType(item.amount, item.protoType.result_type) && (
                <Typography type='body3Bold'>
                  {getTransactionType(item.amount, item.protoType.result_type)}
                </Typography>
              )}
              {getTransactionSign(item.amount) &&
                getFromToAddr(
                  getTransactionSign(item.amount),
                  item.protoType.from,
                  item.protoType.to,
                ) && (
                  <Typography type='body3Reg' color={theme.color.neutral[2]}>
                    {`${getTransactionSign(item.amount)}: ${getFromToAddr(
                      getTransactionSign(item.amount),
                      item.protoType.from,
                      item.protoType.to,
                    )}`}
                  </Typography>
                )}
            </Center>
            <Typography type='body3Reg'>{`${item.amount} ${item.nftType}`}</Typography>
          </ListItem>
        ))}
      </BoxWrap>
    </Wrapper>
  );
};
