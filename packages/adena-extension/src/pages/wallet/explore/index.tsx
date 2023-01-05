import Text from '@components/text';
import React, { useState } from 'react';
import styled from 'styled-components';
import link from '../../../assets/share.svg';
import theme from '@styles/theme';
import { useRecoilState } from 'recoil';
import { ExploreState } from '@states/index';

export const Explore = () => {

  const [exploreSites] = useRecoilState(ExploreState.sites);

  return (
    <Wrapper>
      <Text type='header4' className='explore-title'>
        Explore
      </Text>
      {exploreSites.length &&
        exploreSites.map((exploreSite, index) => (
          <BoxContainer key={index}>
            <img src={exploreSite.logo} alt='logo-image' />
            <Contents>
              <Text type='body2Bold'>{exploreSite.name}</Text>
              <Text type='captionReg' color={theme.color.neutral[9]}>
                {exploreSite.description}
              </Text>
            </Contents>
            <MoveToLink src={link} alt='move to link' onClick={() => window.open(exploreSite.link)} />
          </BoxContainer>
        ))}
    </Wrapper>
  );
};

const MoveToLink = styled.img`
  margin-left: auto;
  cursor: pointer;
`;

const Contents = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'center')};
  margin-left: 12px;
`;

const BoxContainer = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  width: 100%;
  height: 60px;
  padding: 10px 17px;
  border-radius: 18px;
  margin-bottom: 12px;
  cursor: default;
`;

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
  & .explore-title {
    margin-bottom: 12px;
  }
`;
