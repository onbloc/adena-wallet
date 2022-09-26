import theme from '@styles/theme';
import Typography from '@ui/common/Typography';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import styled from 'styled-components';
import { CopyTooltip } from '../Tooltip';
import { StatusDot } from '../StatusDot';
import { DrawerMenu } from '../DrawerMenu/DrawerMenu';
import { HamburgerMenuBtn } from '@ui/common/Button/HamburgerMenuBtn';
import { useSdk } from '@services/client';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const Wrapper = styled.header`
  width: 100%;
  height: 100%;
  padding: 0px 20px 0px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.neutral[6]};
`;

const Header = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 100%;
  position: relative;
  & > img {
    ${({ theme }) => theme.mixins.positionCenter('absolute')}
  }
`;

export const TopMenu = () => {
  const { address, addrname } = useSdk();
  const [open, setOpen] = useState(false);
  const [connectedAddr, setConnectedAddr] = useState('');

  const toggleMenuHandler = () => setOpen(!open);
  useEffect(() => {
    (async () => {
      const net = await axios.get('https://conf.adena.app/net.json');
      setConnectedAddr(net.data.chainName);
    })();
  }, [connectedAddr]);

  return (
    <>
      {address && addrname && (
        <Wrapper>
          <Header>
            <HamburgerMenuBtn type='button' onClick={toggleMenuHandler} />
            <CopyTooltip copyText={address}>
              <>
                <Typography type='body1Bold'>
                  {addrname[0].length > 11 ? `${addrname[0].slice(0, 11)}..` : addrname[0]}
                </Typography>
                <Typography type='body1Reg' color={theme.color.neutral[4]}>
                  {` (${address.slice(0, 4)}...${address.slice(-4)})`}
                </Typography>
              </>
            </CopyTooltip>
            <StatusDot status={1} tooltipText={connectedAddr} />
          </Header>
          <DrawerMenu open={open} setOpen={setOpen} onClick={toggleMenuHandler} />
        </Wrapper>
      )}
    </>
  );
};
