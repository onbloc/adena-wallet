import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { parseTxsEachDate } from '@common/utils/client-utils';
import ListWithDate from '@components/list-box/list-with-date';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGnoClient } from '@hooks/use-gno-client';
import LoadingHistory from '@components/loading-screen/loading-history';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 80px;
  position: relative;
  & .history-title {
    margin-bottom: 12px;
  }
  & .no-transaction {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;

export const History = () => {
  const navigate = useNavigate();
  const historyItemClick = (item: any) => navigate(RoutePath.TransactionDetail, { state: item });
  const [datas, setDatas] = useState<any[]>([]);

  const [currentAccount] = useCurrentAccount();
  const [gnoClient] = useGnoClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState('LOADING');

  useEffect(() => {
    setState('LOADING');
    initHistoryDatas();
  }, []);

  useEffect(() => {
    const historyFetchTimer = setInterval(() => {
      initHistoryDatas()
    }, 5000);

    return () => { clearInterval(historyFetchTimer) }
  }, []);

  const initHistoryDatas = async () => {
    if (gnoClient && currentAccount) {
      try {
        const address = currentAccount.data.address;
        const historyDatas = await gnoClient.getTransactionHistory(address);
        const data = parseTxsEachDate(historyDatas);
        setDatas(Object.values(data));
      } catch (e) {
        console.error(e);
        setDatas([]);
      }
      setState('FINISH');
    }
  };

  return (
    <Wrapper ref={scrollRef}>
      <Text type='header4' className='history-title'>
        History
      </Text>
      {state === 'FINISH' ? (
        datas.length > 0 ? (
          datas.map((item, idx) => (
            <ListWithDate
              key={idx}
              date={item.date}
              transaction={item.transaction}
              onClick={historyItemClick}
            />
          ))
        ) : (
          <Text className='no-transaction' type='body1Reg' color={theme.color.neutral[9]}>
            No transaction to display
          </Text>
        )
      ) : (
        <LoadingHistory />
      )}
    </Wrapper>
  );
};
