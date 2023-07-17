import theme from '@styles/theme';
import Text from '@components/text';
import React, { useState } from 'react';
import styled from 'styled-components';
import ListBox from '@components/list-box';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useNavigate } from 'react-router-dom';
import LoadingChangeNetwork from '@components/loading-screen/loading-change-network';
import { RoutePath } from '@router/path';
import LoadingWallet from '@components/loading-screen/loading-wallet';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useNetwork } from '@hooks/use-network';
import { NetworkMetainfo } from '@states/network';
import AddCustomNetworkButton from '@components/change-network/add-custom-network-button/add-custom-network-button';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.color.neutral[7]};
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
  .network-list {
    display: flex;
    flex-shrink: 0;
    margin-top: 12px;
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100vh - 96px);
    padding-top: 24px;
    padding-bottom: 96px;
    overflow-y: scroll;

    .list-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
  }

  .close-wrapper {
    position: absolute;
    display: flex;
    left: 0;
    bottom: 0;
    width: 100vw;
    height: 96px;
    padding: 24px 20px;
    background-color: ${({ theme }) => theme.color.neutral[7]};
    box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  }
`;

const LeftWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'center')}
  margin-right: auto;
`;

export const ChangeNetwork = () => {
  const navigate = useNavigate();
  const [loadinsgState] = useState('INIT');
  const { currentNetwork, networks, changeNetwork, addNetwork } = useNetwork();
  const [, setState] = useRecoilState(WalletState.state);

  const onClickNetwork = async (network: NetworkMetainfo) => {
    if (network.id === currentNetwork?.id) {
      return;
    }
    setState('LOADING');
    await changeNetwork(network.id);
    setState('FINISH');
    navigate(RoutePath.Wallet);
  };

  const onClickAddCustomNetwork = () => {
    navigate(RoutePath.AddCustomNetwork);
  };

  return loadinsgState === 'INIT' ? (
    <Wrapper>
      <div className='content-wrapper'>
        <Text type='header4'>Change Network</Text>
        {networks.length > 0 ? (
          <>
            {networks.map((network: NetworkMetainfo, index: number) => (
              <ListBox
                left={
                  <LeftWrap>
                    <Text type='body3Bold'>{network.networkName}</Text>
                    <Text type='body3Reg' color={theme.color.neutral[9]}>
                      {network.rpcUrl}
                    </Text>
                  </LeftWrap>
                }
                center={null}
                right={
                  network.id === currentNetwork?.id ? (
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
        <AddCustomNetworkButton onClick={onClickAddCustomNetwork} />
      </div>
      <div className='close-wrapper'>
        <Button
          fullWidth
          hierarchy={ButtonHierarchy.Dark}
          onClick={() => navigate(-1)}
          margin='auto 0px 0px'
        >
          <Text type='body1Bold'>Close</Text>
        </Button>
      </div>
    </Wrapper>
  ) : (
    <LoadingWallet />
  );
};
