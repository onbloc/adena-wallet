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
import LoadingWallet from '@components/loading-screen/loading-wallet';
import { useRecoilState } from 'recoil';
import { CommonState, WalletState } from '@states/index';
import { useNetwork } from '@hooks/use-network';

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
  const [loadinsgState] = useState('INIT');
  const [gnoClient, gnoClients] = useGnoClient();
  const { changeNetwork } = useNetwork();
  const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [, setFailedNetworkChainId] = useRecoilState(CommonState.failedNetworkChainId);
  const [, setState] = useRecoilState(WalletState.state);

  useEffect(() => {
    if (loadinsgState === 'FINISH') {
      checkHealth();
    }
  }, [loadinsgState]);

  const checkHealth = async () => {
    let health = false;
    try {
      health = (await gnoClient?.isHealth()) ?? false;
    } catch (e) {
      console.log(e);
    }
    setFailedNetwork(!health);
    if (!health) {
      const chainId = gnoClient?.chainId;
      setFailedNetworkChainId(chainId ?? "");
      setState('FAIL');
    }
  };

  const onClickNetwork = async (network: GnoClient) => {
    if (network.chainId === gnoClient?.chainId) {
      return;
    }
    setState('LOADING');
    await changeNetwork(network.chainId);
    navigate(RoutePath.Wallet);
  };

  return loadinsgState === 'INIT' ? (
    <Wrapper>
      <Text type='header4'>Change Network</Text>
      {gnoClients.length > 0 ? (
        <>
          {gnoClients.map((network: GnoClient, index: number) => (
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
                network.chainId === gnoClient?.chainId ? (
                  <Button width='100px' height='25px' bgColor={theme.color.green[2]}>
                    <Text type='body3Reg'>Connected</Text>
                  </Button>
                ) : null
              }
              hoverAction={true}
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
