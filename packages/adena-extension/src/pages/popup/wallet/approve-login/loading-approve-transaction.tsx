import React from 'react';
import styled from 'styled-components';

import { Loading, SkeletonBoxStyle } from '@components/atoms';
import { GhostButtons } from '@components/molecules';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

interface ApproveProps {
  leftButtonText?: string;
  rightButtonText?: string;
  className?: string;
}

const LoadingApproveTransaction = ({
  leftButtonText,
  rightButtonText,
}: ApproveProps): JSX.Element => {
  return (
    <Wrapper>
      <Loading.Round width='163px' height='14px' radius='24px' />
      <SkeletonBox />
      <AllRadiusBox align='center'>
        <Loading.Round width='100px' height='10px' radius='24px' />
      </AllRadiusBox>
      <TopRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='100px' height='10px' radius='24px' />
      </TopRadiusBox>
      <BottomRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='50px' height='10px' radius='24px' />
      </BottomRadiusBox>
      <AllRadiusBox>
        <Loading.Round width='65px' height='10px' radius='24px' />
        <Loading.Round width='70px' height='10px' radius='24px' />
      </AllRadiusBox>
      <GhostButtons
        left={leftButtonText ?? 'Cancel'}
        right={rightButtonText ?? ''}
        className='l-approve'
      />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  max-width: 380px;
  min-height: 514px;
  padding: 29px 20px 24px;
  .l-approve {
    margin-top: auto;
  }
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-end', justify: 'space-between' })}
  width: 80px;
  height: 80px;
  margin: 39px 0px 24px;
  border-radius: 8px;
`;

const RoundedBox = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: 41px;
  background-color: ${getTheme('neutral', '_9')};
  padding: 0px 18px;
`;

const AllRadiusBox = styled(RoundedBox)<{ align?: string }>`
  border-radius: 24px;
  justify-content: ${({ align }): string | undefined => align && align};
`;

const TopRadiusBox = styled(RoundedBox)`
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  margin: 7px 0px 2px;
`;

const BottomRadiusBox = styled(RoundedBox)`
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  margin-bottom: 10px;
`;

export default LoadingApproveTransaction;
