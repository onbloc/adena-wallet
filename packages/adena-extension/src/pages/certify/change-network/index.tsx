import theme from '@styles/theme';
import Text from '@components/text';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import ListBox from '@components/list-box';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useNavigate } from 'react-router-dom';
import LoadingChangeNetwork from '@components/loading-screen/loading-change-network';
import { useGnoClient } from '@hooks/use-gno-client';
import { GnoClient } from 'gno-client';
import { RoutePath } from '@router/path';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { useWallet } from '@hooks/use-wallet';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import LoadingWallet from '@components/loading-screen/loading-wallet';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
  .network-list {
    margin-top: 12px;
  }
`;

const LeftWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'center')}
  margin-right: auto;
`;

export const ChangeNetwork = () => {
  const navigate = useNavigate();
  const [loadinsgState, setLoadingState] = useState('INIT');
  const [wallet] = useWallet();
  const { initAccounts } = useWalletAccounts(wallet);
  const [currentNetwork, networks, updateNetworks, changeNetwork] = useGnoClient();
  const [balances, updateBalances] = useWalletBalances();

  useEffect(() => {
    updateNetworks();
  }, []);

  useEffect(() => {
    if (loadinsgState === 'LOADING') {
      updateBalances();
    }
  }, [currentNetwork]);

  useEffect(() => {
    if (loadinsgState === 'LOADING') {
      setLoadingState('FINISH');
    }
  }, [balances]);

  useEffect(() => {
    if (loadinsgState === 'FINISH') {
      navigate(RoutePath.Wallet);
    }
  }, [loadinsgState]);

  const onClickNetwork = async (network: InstanceType<typeof GnoClient>) => {
    if (network.chainId === currentNetwork?.chainId) {
      return;
    }
    setLoadingState('LOADING');
    await changeNetwork(network.chainId);
    await initAccounts();
  };

  return loadinsgState !== 'LOADING' ? (
    <Wrapper>
      <Text type='header4'>Change Network</Text>
      {networks.length > 0 ? (
        <>
          {networks.map((network: InstanceType<typeof GnoClient>, index: number) => (
            <ListBox
              left={
                <LeftWrap>
                  <Text type='body3Bold'>{network.chainName}</Text>
                  <Text type='body3Reg' color={theme.color.neutral[9]}>
                    {network.url}
                  </Text>
                </LeftWrap>
              }
              center={null}
              right={
                network.chainId === currentNetwork?.chainId ? (
                  <Button
                    width='100px'
                    height='25px'
                    bgColor={theme.color.green[2]}
                  >
                    <Text type='body3Reg'>Connected</Text>
                  </Button>
                ) : null
              }
              hoverAction={true}
              gap={12}
              key={index}
              onClick={() => onClickNetwork(network)}
              className='network-list'
              padding='0px 17px'
            />
          ))}
        </>
      ) : (
        <LoadingChangeNetwork />
      )}
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        onClick={() => navigate(-1)}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  ) : (
    <LoadingWallet />
  );
};
