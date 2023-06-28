import Text from '@components/text';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import link from '../../../assets/share.svg';
import theme from '@styles/theme';
import { useRecoilState } from 'recoil';
import { ExploreState } from '@states/index';
import { SiteInfo } from '@states/explore';
import { createImageByURI } from '@common/utils/client-utils';
import LoadingExplore from '@components/loading-screen/loading-explore';
import { useAdenaContext } from '@hooks/use-context';

export const Explore = () => {
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

  async function initExploreSties() {
    try {
      const response = await tokenService.getAppInfos();
      const exploreSites = response
        .filter((site) => site.display)
        .sort((site) => site.order)
        .map(fetchExploreSite);
      Promise.all([...exploreSites])
        .then(setExploreSites);
    } catch (error) {
      console.error(error);
    }
  }

  const fetchExploreSite = async (exploreSite: SiteInfo) => {
    if (exploreSite.logo.startsWith('data:image')) {
      return exploreSite;
    }
    const logo = await createImageByURI(exploreSite.logo);
    return {
      ...exploreSite,
      logo: logo || ''
    }
  }

  return (
    <Wrapper>
      <Text type='header4' className='explore-title'>
        Explore
      </Text>
      {loading || exploreSites.length === 0 ?
        <LoadingExplore /> :
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
        ))
      }
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
