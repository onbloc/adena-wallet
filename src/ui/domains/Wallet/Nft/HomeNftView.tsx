import theme from '@styles/theme';
import { CommingSoon } from '@ui/common/CommingSoon';
import Typography from '@ui/common/Typography';
import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  /* ${({ theme }) => theme.mixins.flexbox('row', 'center', 'fle')} */
  width: 100%;
  height: 100%;
  padding-top: 24px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
  .desc {
    ${({ theme }) => theme.mixins.positionCenter()};
  }
`;

export const HomeNftView = () => {
  return (
    <Wrapper>
      <Typography type='header4'>NFTs</Typography>
      <Typography className='desc' type='body1Reg' color={theme.color.neutral[2]}>
        No NFTs to display
      </Typography>
    </Wrapper>
  );
};
