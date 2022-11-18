import Text from '@components/text';
import React from 'react';
import styled from 'styled-components';
import link from '../../../assets/share.svg';
import gnoland from '../../../assets/gnoland.svg';
import gnospace from '../../../assets/gnospace.svg';
import gnoscan from '../../../assets/gnoscan.svg';
import gnotools from '../../../assets/gnotools.svg';
import teritori from '../../../assets/teritori.svg';
import theme from '@styles/theme';

const data = [
  {
    logo: gnoland,
    title: 'GNO.LAND',
    desc: 'The official website of Gnoland',
    link: 'https://gno.land/',
  },
  {
    logo: gnospace,
    title: 'Gnoland Space',
    desc: 'A community-driven Gnoland wiki',
    link: 'https://gnoland.space/',
  },
  {
    logo: gnoscan,
    title: 'Gnoscan',
    desc: 'The first Gnoland blockchain explorer',
    link: 'https://gnoscan.io/',
  },
  {
    logo: gnotools,
    title: 'Gnotools',
    desc: 'A frontend for Gnoland Boards',
    link: 'https://app.gno.tools/',
  },
  {
    logo: teritori,
    title: 'Teritori',
    desc: 'A hub for web3 communities',
    link: 'https://teritori.com/',
  },
];

export const Explore = () => {
  return (
    <Wrapper>
      <Text type='header4' className='explore-title'>
        Explore
      </Text>
      {data.length &&
        data.map((v, i) => (
          <BoxContainer key={i}>
            <img src={v.logo} alt='logo-image' />
            <Contents>
              <Text type='body2Bold'>{v.title}</Text>
              <Text type='captionReg' color={theme.color.neutral[9]}>
                {v.desc}
              </Text>
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
