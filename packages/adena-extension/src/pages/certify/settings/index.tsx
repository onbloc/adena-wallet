import React, { useCallback } from 'react';
import styled, { CSSProp, FlattenSimpleInterpolation } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import FullButtonRightIcon from '@components/buttons/full-button-right-icon';
import BottomFixedButton from '@components/buttons/bottom-fixed-button';

const menuMakerInfo = [
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
  const navigate = useNavigate();

  const moveBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
      <BottomFixedButton text='Close' onClick={moveBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  margin-bottom: 20px;
  overflow-y: auto;

  .title-wrapper {
    width: 100%;
    margin-bottom: 12px;

    .title {
      ${({ theme }): FlattenSimpleInterpolation => theme.fonts.header4};
    }
  }
`;
