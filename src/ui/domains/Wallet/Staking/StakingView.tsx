import Typography from '@ui/common/Typography';
import React from 'react';
import styled from 'styled-components';
import stakingBg from '../../../../assets/staking-bg.svg';
import { CommingSoon } from '@ui/common/CommingSoon';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: url(${stakingBg}) no-repeat center 29px / contain;
  padding-top: 24px;
  ::after {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0px;
    left: 0px;
    background-color: rgba(33, 33, 40, 0.7);
  }
  .staking-title {
    position: absolute;
    top: 24px;
    left: 0px;
    z-index: 1;
  }
`;

export const StakingView = () => {
  return (
    <Wrapper>
      <Typography className='staking-title' type='header4'>
        Staking
      </Typography>
      <CommingSoon />
    </Wrapper>
  );
};
