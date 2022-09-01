import React from 'react';
import styled, { keyframes } from 'styled-components';
import Circle from '@ui/common/Loading/Circle';
import GhostButtons from '@ui/common/Loading/GhostButtons';
import Round from '@ui/common/Loading/Round';

const pulseKeyframe = keyframes`
  to {
		background-position: right -160px top 0;
	}
`;

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  position: relative;
  width: 100%;
  height: 492px;
  padding-top: 29px;
`;

const RoundsBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-end', 'center')};
  margin-left: auto;
`;

const SkeletonBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')};
  width: 100%;
  height: 60px;
  background-color: ${({ theme }) => theme.color.neutral[6]};
  border-radius: 18px;
  padding: 0px 17px 0px 14px;
  margin-top: 31px;
  & + & {
    margin-top: 12px;
  }
  background-image: linear-gradient(
    270deg,
    rgba(82, 82, 107, 0) 0%,
    rgba(123, 123, 152, 0.32) 48.44%,
    rgba(82, 82, 107, 0) 100%
  );
  background-size: 150px 100%;
  background-repeat: no-repeat;
  background-position: left -160px top 0;
  animation: ${pulseKeyframe} 1.2s ease infinite;
`;

const LoadingDefaultWallet = () => {
  return (
    <Wrapper>
      <Round width='163px' height='14px' radius='24px' />
      <Round width='91px' height='14px' radius='24px' margin='36px 0px 31px' />
      <GhostButtons left='Deposit' right='Send' />
      {Array.from({ length: 3 }, (v, i) => (
        <SkeletonBox key={i}>
          <Circle width='34px' height='34px' margin='0px 15px 0px 0px' />
          <Round width='91px' height='10px' radius='24px' />
          <RoundsBox>
            <Round width='100px' height='10px' radius='24px' />
            <Round width='58px' height='10px' radius='24px' margin='10px 0px 0px' />
          </RoundsBox>
        </SkeletonBox>
      ))}
    </Wrapper>
  );
};

export default LoadingDefaultWallet;
