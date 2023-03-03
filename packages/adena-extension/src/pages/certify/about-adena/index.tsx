import BottomFixedButton from '@components/buttons/bottom-fixed-button';
import React from 'react';
import styled from 'styled-components';
import logo from '@assets/logo-default-v2.svg';
import Text from '@components/text';
import theme from '@styles/theme';
import FullButtonRightIcon, { ButtonMode } from '@components/buttons/full-button-right-icon';

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

export const AboutAdena = () => {
  const onClickWebLink = (path: string) => {
    return window.open(path, '_blank');
  };

  return (
    <Wrapper>
      <Logo src={logo} alt='logo' />
      <Text type='light13' color={theme.color.neutral[9]} margin='0px 0px 22px'>
        Version 1.4.4
      </Text>
      {menuMakerInfo.map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          onClick={() => onClickWebLink(v.navigatePath)}
          mode={v.mode as ButtonMode}
          icon='WEBLINK'
        />
      ))}
      <BottomFixedButton />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 36px;
  padding-bottom: 116px;
  overflow-y: auto;
`;

const Logo = styled.img``;
