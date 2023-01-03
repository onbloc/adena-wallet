import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import Icon, { IconName } from '@components/icons';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';

const Wrapper = styled.nav`
  width: 100%;
  height: 60px;
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  background-color: ${({ theme }) => theme.color.neutral[7]};
  filter: drop-shadow(0px -4px 4px rgba(0, 0, 0, 0.25));
  padding: 0px 30px;
  gap: 40px;
  position: fixed;
  bottom: 0px;
  svg {
    * {
      transition: fill 0.3s ease;
    }
    &:hover,
    &.active {
      .icon-default {
        fill: ${({ theme }) => theme.color.neutral[0]};
      }
      .icon-primary {
        fill: ${({ theme }) => theme.color.primary[3]};
      }
    }
  }
`;

export const Navigation = () => {
  const navigate = useNavigate();
  const [loading] = useState(false);
  const wallet = useMatch(RoutePath.Wallet);
  const explore = useMatch(RoutePath.Explore);
  const nft = useMatch(RoutePath.Nft);
  const history = useMatch(RoutePath.History);
  const settings = useMatch(RoutePath.Setting);
  const tokenDetails = useMatch(RoutePath.TokenDetails);
  const [state] = useRecoilState(WalletState.state);
  const [currentBalance] = useRecoilState(WalletState.currentBalance);
  const [walletState] = useRecoilState(WalletState.state);

  const navItems = [
    {
      iconName: 'iconWallet',
      currAddress: wallet || tokenDetails,
      routingAddress: RoutePath.Wallet,
    },
    {
      iconName: 'iconGallery',
      currAddress: nft,
      routingAddress: RoutePath.Nft,
    },
    {
      iconName: 'iconSearch',
      currAddress: explore,
      routingAddress: RoutePath.Explore,
    },
    {
      iconName: 'iconClock',
      currAddress: history,
      routingAddress: RoutePath.History,
    },
    {
      iconName: 'iconSetting',
      currAddress: settings,
      routingAddress: RoutePath.Setting,
    },
  ];

  const loadingComplete = currentBalance.denom !== '' && walletState === 'FINISH';

  const isRender = () => {
    if (wallet || tokenDetails || nft || explore || history || settings) {
      return loadingComplete;
    }
    return false;
  }


  return (
    <>
      {isRender() && (
        <Wrapper>
          {navItems.map((item, idx) => (
            <div key={idx}>
              <button
                onClick={() =>
                  state === 'FINISH' ? navigate(item.routingAddress, { replace: true }) : null
                }
                disabled={state !== 'FINISH'}
              >
                <Icon
                  name={item.iconName as IconName}
                  className={item.currAddress && !loading ? 'active' : ''}
                />
              </button>
            </div>
          ))}
        </Wrapper>
      )}
    </>
  );
};
