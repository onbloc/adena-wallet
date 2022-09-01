import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { LeftArrowBtn } from '@ui/common/Button/ArrowButtons';
import Typography from '@ui/common/Typography';
import logo from '../../../../assets/gnot-logo.svg';
import etc from '../../../../assets/etc.svg';
import { HistoryItem } from '@ui/common/HistoryItem';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DubbleButton from '@ui/common/Button/DubbleButton';
import { useSdk } from '@services/client';
import { parseTxsEachDate } from '@services/utils';
import { StaticTooltip } from '@ui/common/Menu/Tooltip';
import theme from '@styles/theme';

const model = {
  gnot: '43,833.3923',
};

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
  .gnot-title {
    width: 100%;
    text-align: center;
    margin: 0px auto;
  }
`;

const HeaderWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  position: relative;
  width: 100%;
  margin-bottom: 20px;
  & > button {
    position: absolute;
    left: 0;
  }
`;

const EtcIcon = styled.div`
  position: absolute;
  right: 0px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  &.show-tooltip {
    background-color: ${({ theme }) => theme.color.neutral[3]};
    & > .static-tooltip {
      visibility: visible;
      transition: all 0.1s ease-in-out;
      transform: scale(1);
    }
  }
`;

export const TokenDetailsView = () => {
  const navigate = useNavigate();
  const [etcClicked, setEtcClicked] = useState(false);
  const handlePrevButtonClick = () => navigate(RoutePath.Wallet);
  const DepositButtonClick = () => navigate(RoutePath.Deposit, { state: 'token' });
  const SendButtonClick = () => navigate(RoutePath.GeneralSend, { state: 'token' });
  const historyItemClick = (item: any) => navigate(RoutePath.TransactionDetail, { state: item });
  const { address, explorerClient: client, getSigner, balance, refreshBalance } = useSdk();
  const [datas, setDatas] = useState<any[]>([]);

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
      await client.getHistory(address).then(async (txs) => {
        const res = parseTxsEachDate(txs, address);
        setDatas(Object.values(res));
      });
    })();
  }, []);

  const etcButtonClick = () => setEtcClicked((prev: boolean) => !prev);

  return (
    <Wrapper>
      <HeaderWrap>
        <LeftArrowBtn onClick={handlePrevButtonClick} />
        <Typography type='header4'>Gnoland</Typography>
        <EtcIcon className={etcClicked ? 'show-tooltip' : ''} onClick={etcButtonClick}>
          <img src={etc} alt='View on Gnoscan' />
          <StaticTooltip
            tooltipText='View on Gnoscan'
            bgColor={theme.color.neutral[3]}
            posTop='28px'
            onClick={() => {
              window.open('https://gnoscan.io/', '_blank');
            }}
          />
        </EtcIcon>
      </HeaderWrap>
      <Typography className='gnot-title' type='title1'>{`${Number(balance[0].amount).toLocaleString(
        'en-US',
        {
          maximumFractionDigits: 6,
        },
      )}\nGNOT`}</Typography>
      <DubbleButton
        margin='28px 0px 25px'
        leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
        rightProps={{
          onClick: SendButtonClick,
          text: 'Send',
        }}
      />
      {datas.map((item, idx) => (
        <HistoryItem
          onClick={historyItemClick}
          key={idx}
          date={item.date}
          transaction={item.transaction}
        />
      ))}
    </Wrapper>
  );
};
