import React from 'react';
import styled from 'styled-components';
import { Link, useMatch } from 'react-router-dom';
import { RoutePath } from '@router/path';

const icons = {
  walletOn: require('../../../assets/wallet-on.svg').default,
  walletOff: require('../../../assets/wallet-off.svg').default,
  galleryOn: require('../../../assets/gallery-on.svg').default,
  galleryOff: require('../../../assets/gallery-off.svg').default,
  searchOn: require('../../../assets/search-on.svg').default,
  searchOff: require('../../../assets/search-off.svg').default,
  clockOn: require('../../../assets/clock-on.svg').default,
  clockOff: require('../../../assets/clock-off.svg').default,
  settingOn: require('../../../assets/setting-on.svg').default,
  settingOff: require('../../../assets/setting-off.svg').default,
};

const Wrapper = styled.nav`
  width: 100%;
  height: 60px;
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  background-color: ${({ theme }) => theme.color.neutral[7]};
  filter: drop-shadow(0px -4px 4px rgba(0, 0, 0, 0.25));
  padding: 0px 30px;
  gap: 40px;
  position: absolute;
  bottom: 0px;
`;

export const Navigation = () => {
  const wallet = useMatch(RoutePath.Wallet);
  const explore = useMatch(RoutePath.Explore);
  const nft = useMatch(RoutePath.Nft);
  const history = useMatch(RoutePath.History);
  const settings = useMatch(RoutePath.Setting);
  const tokenDetails = useMatch(RoutePath.TokenDetails);

  const navItems = [
    {
      currAddress: wallet || tokenDetails,
      routingAddress: RoutePath.Wallet,
      unselected: icons.walletOff,
      selected: icons.walletOn,
    },
    {
      currAddress: nft,
      routingAddress: RoutePath.Nft,
      unselected: icons.galleryOff,
      selected: icons.galleryOn,
    },
    {
      currAddress: explore,
      routingAddress: RoutePath.Explore,
      unselected: icons.searchOff,
      selected: icons.searchOn,
    },
    {
      currAddress: history,
      routingAddress: RoutePath.History,
      unselected: icons.clockOff,
      selected: icons.clockOn,
    },
    {
      currAddress: settings,
      routingAddress: RoutePath.Setting,
      unselected: icons.settingOff,
      selected: icons.settingOn,
    },
  ];

  return (
    <>
      {(wallet || tokenDetails || nft || explore || history || settings) && (
        <Wrapper>
          {navItems.map((item, idx) => (
            <div key={idx}>
              <Link to={item.routingAddress} replace>
                <img
                  src={item.currAddress ? item.selected : item.unselected}
                  alt='navigation-icon'
                />
              </Link>
            </div>
          ))}
        </Wrapper>
      )}
    </>
  );
};
