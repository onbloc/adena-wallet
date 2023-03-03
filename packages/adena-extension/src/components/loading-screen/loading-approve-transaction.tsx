import { GhostButtons, Round, SkeletonBoxStyle } from '@components/loadings';
import React from 'react';
import styled from 'styled-components';

interface ApproveProps {
  leftButtonText?: string;
  rightButtonText?: string;
  className?: string;
}

const LoadingApproveTransaction = ({
  leftButtonText,
  rightButtonText,
  className,
}: ApproveProps) => {
  return (
    <Wrapper>
      <Round width='163px' height='14px' radius='24px' />
      <SkeletonBox />
      <AllRadiusBox align='center'>
        <Round width='100px' height='10px' radius='24px' />
      </AllRadiusBox>
      <TopRadiusBox>
        <Round width='65px' height='10px' radius='24px' />
        <Round width='100px' height='10px' radius='24px' />
      </TopRadiusBox>
      <BottomRadiusBox>
        <Round width='65px' height='10px' radius='24px' />
        <Round width='50px' height='10px' radius='24px' />
      </BottomRadiusBox>
      <AllRadiusBox>
        <Round width='65px' height='10px' radius='24px' />
        <Round width='70px' height='10px' radius='24px' />
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
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  max-width: 380px;
  min-height: 514px;
  padding: 29px 20px 24px;
  .l-approve {
    margin-top: auto;
  }
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-end', 'space-between')}
  width: 80px;
  height: 80px;
  margin: 39px 0px 24px;
  border-radius: 8px;
`;

const RoundedBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 41px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 18px;
`;

const AllRadiusBox = styled(RoundedBox)<{ align?: string }>`
  border-radius: 24px;
  justify-content: ${({ align }) => align && align};
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

const BundleBox = styled.div`
  margin: 8px 0px 10px;
  gap: 2px;
  dt {
    color: ${({ theme }) => theme.color.neutral[8]};
  }
  & dl:first-child {
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
  }
  & dl:last-child {
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
  }
`;

export default LoadingApproveTransaction;
