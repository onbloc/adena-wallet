import Typography from '@ui/common/Typography';
import React from 'react';
import styled from 'styled-components';
import link from '../../../../assets/share.svg';

const data = [
  {
    logo: require('../../../../assets/gnoland.svg').default,
    title: 'GNO.LAND',
    desc: 'The official website of Gnoland',
    link: 'https://gno.land/',
  },
  {
    logo: require('../../../../assets/gnospace.svg').default,
    title: 'Gnoland Space',
    desc: 'A community-driven Gnoland wiki',
    link: 'https://gnoland.space/',
  },
  {
    logo: require('../../../../assets/gnoscan.svg').default,
    title: 'Gnoscan',
    desc: 'The first Gnoland blockchain explorer',
    link: 'https://gnoscan.io/',
  },
  {
    logo: require('../../../../assets/gnotools.svg').default,
    title: 'Gnotools',
    desc: 'A frontend for Gnoland Boards',
    link: 'https://app.gno.tools/',
  },
  {
    logo: require('../../../../assets/teritori.svg').default,
    title: 'Teritori',
    desc: 'A hub for web3 communities',
    link: 'https://teritori.com/',
  },
];

export const ExploreView = () => {
  return (
    <Wrapper>
      <Typography type='header4' className='explore-title'>
        Explore
      </Typography>
      {data.length &&
        data.map((v, i) => (
          <BoxContainer key={i}>
            <img src={v.logo} alt='logo-image' />
            <Contents>
              <Typography type='body2Bold'>{v.title}</Typography>
              <Typography type='captionReg' color='#A3A3B5'>{v.desc}</Typography>
            </Contents>
            <MoveToLink src={link} alt='move to link' onClick={() => window.open(v.link)} />
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
`;

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  & .explore-title {
    margin-bottom: 12px;
  }
`;
