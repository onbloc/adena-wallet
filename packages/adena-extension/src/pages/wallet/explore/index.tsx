import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useRecoilState } from 'recoil';

import { Text } from '@components/atoms';
import link from '@assets/share.svg';
import { ExploreState } from '@states';
import { useAdenaContext } from '@hooks/use-context';
import LoadingExplore from './loading-explore';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

export const Explore = (): JSX.Element => {
  const theme = useTheme();
  const { tokenService } = useAdenaContext();
  const [exploreSites, setExploreSites] = useRecoilState(ExploreState.sites);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (exploreSites.length === 0) {
      initExploreSties().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [exploreSites]);

  async function initExploreSties(): Promise<void> {
    try {
      const response = await tokenService.getAppInfos();
      const exploreSites = response.filter((site) => site.display).sort((site) => site.order);
      Promise.all([...exploreSites]).then(setExploreSites);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Wrapper>
      <Text type='header4' className='explore-title'>
        Explore
      </Text>
      {loading || exploreSites.length === 0 ? (
        <LoadingExplore />
      ) : (
        exploreSites.map((exploreSite, index) => (
          <BoxContainer key={index}>
            <img src={exploreSite.logo} alt='logo-image' />
            <Contents>
              <Text type='body2Bold'>{exploreSite.name}</Text>
              <Text type='captionReg' color={theme.neutral.a}>
                {exploreSite.description}
              </Text>
            </Contents>
            <MoveToLink
              src={link}
              alt='move to link'
              onClick={(): Window | null => window.open(exploreSite.link)}
            />
          </BoxContainer>
        ))
      )}
    </Wrapper>
  );
};

const MoveToLink = styled.img`
  margin-left: auto;
  cursor: pointer;
`;

const Contents = styled.div`
  ${mixins.flex({ align: 'flex-start' })};
  margin-left: 12px;
`;

const BoxContainer = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  background-color: ${getTheme('neutral', '_9')};
  width: 100%;
  height: 60px;
  padding: 10px 17px;
  border-radius: 18px;
  margin-bottom: 12px;
  cursor: default;
`;

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
  & .explore-title {
    margin-bottom: 12px;
  }
`;
