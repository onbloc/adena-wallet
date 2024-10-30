import { useCallback, useMemo } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { Icon, IconName } from '@components/atoms';
import { useWalletContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import { RoutePath } from '@types';
import React from 'react';

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
  const matchedWallet = useMatch(RoutePath.Wallet);
  const matchedExplore = useMatch(RoutePath.Explore);
  const matchedNft = useMatch(RoutePath.Nft + '/*');
  const matchedHistory = useMatch(RoutePath.History);
  const matchedTokenDetails = useMatch(RoutePath.TokenDetails);
  const { failedNetwork } = useNetwork();

  const { walletStatus } = useWalletContext();

  const isActiveWallet = walletStatus === 'FINISH';

  const navigationItems = useMemo(
    () => [
      {
        iconName: 'iconWallet',
        active: !!matchedWallet || !!matchedTokenDetails,
        routingAddress: RoutePath.Wallet,
      },
      {
        iconName: 'iconGallery',
        active: !!matchedNft,
        routingAddress: RoutePath.Nft,
      },
      {
        iconName: 'iconSearch',
        active: !!matchedExplore,
        routingAddress: RoutePath.Explore,
      },
      {
        iconName: 'iconClock',
        active: !!matchedHistory,
        routingAddress: RoutePath.History,
      },
    ],
    [matchedWallet, matchedExplore, matchedNft, matchedHistory, matchedTokenDetails],
  );

  const visibleNavigation = useMemo(() => {
    if (!isActiveWallet) {
      return false;
    }

    if (failedNetwork || failedNetwork === undefined) {
      return false;
    }

    return (
      !!matchedWallet ||
      !!matchedExplore ||
      !!matchedNft ||
      !!matchedHistory ||
      !!matchedTokenDetails
    );
  }, [
    matchedWallet,
    matchedExplore,
    matchedNft,
    matchedHistory,
    matchedTokenDetails,
    isActiveWallet,
    failedNetwork,
  ]);

  const onClickNavigationItem = useCallback(
    (item: { iconName: string; active: boolean; routingAddress: RoutePath }) => {
      if (!isActiveWallet) {
        return;
      }

      navigate(item.routingAddress, { replace: true });
    },
    [isActiveWallet],
  );

  if (!visibleNavigation) {
    return <React.Fragment />;
  }

  return (
    <Wrapper>
      {navigationItems.map((item, idx) => (
        <div key={idx}>
          <button onClick={(): void => onClickNavigationItem(item)} disabled={!isActiveWallet}>
            <Icon name={item.iconName as IconName} className={item.active ? 'active' : ''} />
          </button>
        </div>
      ))}
    </Wrapper>
  );
};
