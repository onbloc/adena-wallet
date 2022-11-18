import Text from '@components/text';
import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
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

export const Staking = () => {
  return (
    <Wrapper>
      <Text className='staking-title' type='header4'>
        Staking
      </Text>
    </Wrapper>
  );
};
