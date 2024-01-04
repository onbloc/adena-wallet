import React from 'react';
import styled from 'styled-components';

import { FullButtonRightIcon } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import useAppNavigate from '@hooks/use-app-navigation';

const menuMakerInfo: {
  title: string;
  navigatePath:
    | RoutePath.ConnectedApps
    | RoutePath.AddressBook
    | RoutePath.ChangeNetwork
    | RoutePath.SecurityPrivacy
    | RoutePath.AboutAdena;
}[] = [
  {
    title: 'Connected Apps',
    navigatePath: RoutePath.ConnectedApps,
  },
  {
    title: 'Address Book',
    navigatePath: RoutePath.AddressBook,
  },
  {
    title: 'Change Network',
    navigatePath: RoutePath.ChangeNetwork,
  },
  {
    title: 'Security & Privacy',
    navigatePath: RoutePath.SecurityPrivacy,
  },
  {
    title: 'About Adena',
    navigatePath: RoutePath.AboutAdena,
  },
];

export const Settings = (): JSX.Element => {
  const { navigate, goBack } = useAppNavigate();

  return (
    <Wrapper>
      <div className='title-wrapper'>
        <span className='title'>Settings</span>
      </div>
      {menuMakerInfo.map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          onClick={(): void => navigate(v.navigatePath)}
        />
      ))}
      <BottomFixedButton text='Close' onClick={goBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  margin-bottom: 20px;
  overflow-y: auto;

  .title-wrapper {
    width: 100%;
    margin-bottom: 12px;

    .title {
      ${fonts.header4};
    }
  }
`;
