import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Typography from '@ui/common/Typography';
import { HistoryItem } from '@ui/common/HistoryItem';
import theme from '@styles/theme';
import logo from '../../../../assets/gnot-logo.svg';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useSdk } from '@services/client';
import { parseTxsEachDate } from '@services/utils';

interface THistoryData {
  date: string;
  transaction: {
    type: string;
    receiver: string;
    nftImg: string;
    nftType: string;
    account: string;
    amount: string;
  }[];
}

const data: THistoryData[] = [
  {
    date: 'Today',
    transaction: [
      {
        type: 'Delegated',
        receiver: 'From',
        nftImg: logo,
        nftType: 'GNOT',
        account: 'gno5...123n',
        amount: '-4,000',
      },
      {
        type: 'Failed',
        receiver: 'From',
        nftImg: logo,
        nftType: 'GNOS',
        account: 'gno5...123n',
        amount: '-5,462.2436',
      },
    ],
  },
  {
    date: 'Yesterday',
    transaction: [
      {
        type: 'Undelegated',
        receiver: 'To',
        nftImg: logo,
        nftType: 'GNOT',
        account: 'gno5...123n',
        amount: '+5,000',
      },
      {
        type: 'Sent',
        receiver: 'From',
        nftImg: logo,
        nftType: 'GNOS',
        account: 'gno5...123n',
        amount: '-5,462.2436',
      },
    ],
  },
  {
    date: 'Yesterday',
    transaction: [
      {
        type: 'Undelegated',
        receiver: 'To',
        nftImg: logo,
        nftType: 'GNOT',
        account: 'gno5...123n',
        amount: '+5,000',
      },
      {
        type: 'Sent',
        receiver: 'From',
        nftImg: logo,
        nftType: 'GNOS',
        account: 'gno5...123n',
        amount: '-5,462.2436',
      },
    ],
  },
  {
    date: 'Yesterday',
    transaction: [
      {
        type: 'Undelegated',
        receiver: 'To',
        nftImg: logo,
        nftType: 'GNOT',
        account: 'gno5...123n',
        amount: '+5,000',
      },
      {
        type: 'Sent',
        receiver: 'From',
        nftImg: logo,
        nftType: 'GNOS',
        account: 'gno5...123n',
        amount: '-5,462.2436',
      },
    ],
  },
];

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 24px 0px 80px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  & .history-title {
    margin-bottom: 12px;
  }
  & .no-transaction {
    ${({ theme }) => theme.mixins.positionCenter()};
    width: 100%;
    text-align: center;
  }
`;

export const HistoryView = () => {
  const navigate = useNavigate();
  const historyItemClick = (item: any) => navigate(RoutePath.TransactionDetail, { state: item });
  const { address, explorerClient: client, getSigner, balance, refreshBalance } = useSdk();
  const [datas, setDatas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address || !balance) {
      return;
    }

    const signer = getSigner();
    if (!client || !signer) {
      return;
    }

    (async (): Promise<void> => {
      //TODO
      //
      //await refreshBalance();
    })();

    (async () => {
      setLoading(true);
      await client.getHistory(address).then(async (txs) => {
        const res = parseTxsEachDate(txs, address);
        setDatas(Object.values(res));
        setLoading(false);
      });
    })();
  }, []);

  return (
    <Wrapper>
      <Typography type='header4' className='history-title'>
        History
      </Typography>
      {!loading &&
        (datas.length ? (
          datas.map((item, idx) => (
            <HistoryItem
              key={idx}
              date={item.date}
              transaction={item.transaction}
              onClick={historyItemClick}
            />
          ))
        ) : (
          <Typography className='no-transaction' type='body1Reg' color={theme.color.neutral[2]}>
            No transaction to display
          </Typography>
        ))}
    </Wrapper>
  );
};
