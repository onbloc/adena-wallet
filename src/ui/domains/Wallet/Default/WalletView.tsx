import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Typography from '@ui/common/Typography';
import CoinBox from '@ui/common/CoinBox';
import gnotLogo from '../../../../assets/gnot-logo.svg';
import gnosLogo from '../../../../assets/gnos-logo.svg';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import LoadingWalletView from '@ui/domains/LoadingScreen/LoadingDefaultWallet';
import DubbleButton from '@ui/common/Button/DubbleButton';
import { useSdk } from '@services/client';

const model = {
  gnot: '0.000000',
};

const nftData = [
  {
    name: 'Gnoland',
    img: gnotLogo,
    amount: '0.000000',
    type: 'GNOT',
  },
  {
    name: 'Gnoswap',
    img: gnosLogo,
    amount: '0.000000',
    type: 'GNOS',
  },
];

const Wrapper = styled.section`
  padding-top: 14px;
  text-align: center;
`;

export const WalletView = () => {
  const navigate = useNavigate();
  const DepositButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'deposit' });
  const SendButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'send' });
  const CoinBoxClick = () => navigate(RoutePath.TokenDetails);
  const { address, getSigner, balance, refreshBalance, initialized } = useSdk();
  useEffect(() => {
    if (!address) {
      return;
    }
    const signer = getSigner();
    if (!signer) {
      return;
    }
    (async (): Promise<void> => {
      await refreshBalance();
    })();
  }, [refreshBalance, address, getSigner]);

  return (
    <>
      {!initialized ? (
        <LoadingWalletView />
      ) : (
        <Wrapper>
          {balance[0] && balance[0].amount && (
            <Typography type='header2'>{`${
              balance[0] &&
              Number(balance[0].amount).toLocaleString('en-US', {
                maximumFractionDigits: 6,
              })
            }\nGNOT`}</Typography>
          )}
          <DubbleButton
            margin='14px 0px 30px'
            leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
            rightProps={{
              onClick: SendButtonClick,
              text: 'Send',
            }}
          />
          {balance.map((item, idx) => (
            <CoinBox
              key={idx}
              logo={item.img}
              name={item.name}
              amount={Number(item.amount).toLocaleString('en-US', {
                maximumFractionDigits: 6,
              })}
              amountType={item.type}
              onClick={CoinBoxClick}
            />
          ))}
        </Wrapper>
      )}
    </>
  );
};
