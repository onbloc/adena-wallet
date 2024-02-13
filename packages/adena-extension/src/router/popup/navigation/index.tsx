import React, { useState } from 'react';
import styled from 'styled-components';
import { useMatch, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { RoutePath } from '@types';
import { Icon, IconName } from '@components/atoms';
import { CommonState, WalletState } from '@states';
import { useNetwork } from '@hooks/use-network';
import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

const Wrapper = styled.nav`
  width: 100%;
  height: 60px;
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  background-color: ${getTheme('neutral', '_8')};
  filter: drop-shadow(0px -4px 4px rgba(0, 0, 0, 0.25));
  padding: 0px 40px;
  gap: 40px;
  position: fixed;
  bottom: 0px;
  z-index: 5;
  svg {
    * {
      transition: fill 0.3s ease;
    }
    &:hover,
    &.active {
      .icon-default {
        fill: ${getTheme('neutral', '_1')};
      }
      .icon-primary {
        fill: ${getTheme('primary', '_6')};
      }
    }
  }
`;

export const Navigation = (): JSX.Element => {
  const navigate = useNavigate();
  const [loading] = useState(false);
  const wallet = useMatch(RoutePath.Wallet);
  const explore = useMatch(RoutePath.Explore);
  const nft = useMatch(RoutePath.Nft);
  const history = useMatch(RoutePath.History);
  const tokenDetails = useMatch(RoutePath.TokenDetails);
  const [walletState] = useRecoilState(WalletState.state);
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  const { currentNetwork } = useNetwork();

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
  ];

  const loadingComplete = walletState === 'FINISH';

  const isRender = (): boolean => {
    if (wallet || tokenDetails || nft || explore || history) {
      return loadingComplete || failedNetwork[currentNetwork.id] === false;
    }
    return false;
  };

  return (
    <>
      {isRender() && (
        <Wrapper>
          {navItems.map((item, idx) => (
            <div key={idx}>
              <button
                onClick={(): void | null =>
                  walletState === 'FINISH' ? navigate(item.routingAddress, { replace: true }) : null
                }
                disabled={walletState !== 'FINISH'}
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
