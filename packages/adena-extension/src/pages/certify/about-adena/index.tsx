import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import logo from '@assets/logo-default-v2.svg';
import { Text, FullButtonRightIcon, ButtonMode } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigation';

const menuMakerInfo = [
  {
    title: 'Website',
    navigatePath: 'https://adena.app/',
    mode: 'DEFAULT',
  },
  {
    title: 'Developer Docs',
    navigatePath: 'https://docs.adena.app/',
    mode: 'DEFAULT',
  },
  {
    title: 'GitHub',
    navigatePath: 'https://github.com/onbloc/adena-wallet',
    mode: 'DEFAULT',
  },
  {
    title: 'Help & Support',
    navigatePath: 'https://docs.adena.app/resources/faq',
    mode: 'DEFAULT',
  },
  {
    title: 'Terms of Use',
    navigatePath: 'https://adena.app/terms',
    mode: 'DEFAULT',
  },
  {
    title: 'Privacy Policy',
    navigatePath: 'https://adena.app/privacy',
    mode: 'DEFAULT',
  },
];

export const AboutAdena = (): JSX.Element => {
  const theme = useTheme();
  const [version, setVersion] = useState('');
  const { goBack } = useAppNavigate();

  useEffect(() => {
    initVersion();
  }, []);

  const initVersion = (): void => {
    const manifest = chrome.runtime.getManifest();
    setVersion(`${manifest.version}`);
  };

  const onClickWebLink = (path: string): Window | null => {
    return window.open(path, '_blank');
  };

  return (
    <Wrapper>
      <Logo src={logo} alt='logo' />
      <Text type='light13' color={theme.neutral.a} margin='0px 0px 22px'>
        {`Version ${version}`}
      </Text>
      {menuMakerInfo.map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          onClick={(): Window | null => onClickWebLink(v.navigatePath)}
          mode={v.mode as ButtonMode}
          icon='WEBLINK'
        />
      ))}
      <BottomFixedButton onClick={goBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 36px;
  padding-bottom: 116px;
  overflow-y: auto;
`;

const Logo = styled.img``;
