import React from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import FullButtonRightIcon, { ButtonMode } from '@components/buttons/full-button-right-icon';
import BottomFixedButton from '@components/buttons/bottom-fixed-button';
import { RoutePath } from '@router/path';

const menuMakerInfo = [
  {
    title: 'Change Password',
    navigatePath: RoutePath.SettingChangePassword,
    mode: 'DEFAULT',
  },
  {
    title: 'Reveal Seed Phrase',
    navigatePath: RoutePath.RevealPasswoardPhrase,
    mode: 'DEFAULT',
  },
  {
    title: 'Export Private Key',
    navigatePath: RoutePath.ApproachPasswordPhrase,
    mode: 'DEFAULT',
  },
  {
    title: 'Remove Account',
    navigatePath: RoutePath.RemoveAccount,
    mode: 'DANGER',
  },
  {
    title: 'Reset Wallet',
    navigatePath: RoutePath.ResetWallet,
    mode: 'DANGER',
  },
];

export const SecurityPrivacy = () => {
  const navigate = useNavigate();
  return (
    <Wrapper>
      <Text type='header4' margin='0px 0px 12px 0px'>
        Security & Privacy
      </Text>
      {menuMakerInfo.map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          onClick={() => navigate(v.navigatePath)}
          mode={v.mode as ButtonMode}
        />
      ))}
      <BottomFixedButton />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 103px;
  overflow-y: auto;
`;
